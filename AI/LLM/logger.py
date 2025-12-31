import json
import time
from datetime import datetime
from typing import Dict, Optional
from collections import Counter
from .metrics import ResponseMetricsCalculator, MemoryMetrics

class PerformanceLogger:
    """
    A class to log performance metrics for the LLM application with a single timestamp per question.
    """

    def __init__(self, log_path: str = "llm_performance.log"):
        self.log_path = log_path
        self.start_time = time.time()
        self.metrics = {
            'total_tokens': 0,
            'total_requests': 0,
            'retrieval_times': [],
            'validation_times': [],
            'generation_times': [],
            'chain of thought_times': [],
            'error_count': 0,
            'total_processing_times': [],
            'source_usage': Counter(),
            'intent_usage': Counter(),
            'response_quality_metrics': {
                'readability_scores': [],
                'coherence_scores': [],
                'hallucination_rates': [],
                'redundancy_rates': []
            },
            'memory_utilization': {
                'cpu_utilization': [],
                'memory_usage': [],
                'embedding_size': []
            }
        }
        self.metrics_calculator = ResponseMetricsCalculator()
        self.memory_metrics = None  # Will be initialized in main.py
        self.current_timestamp = None
        self.BYTES_TO_KB = 1024

    def set_memory_metrics(self, memory_metrics: MemoryMetrics):
        """Set the MemoryMetrics instance."""
        self.memory_metrics = memory_metrics

    def _format_number(self, value: float) -> float:
        """Helper method to format numbers to 2 decimal places."""
        return round(float(value), 2)

    def start_new_question(self):
        """Record timestamp for a new question."""
        self.current_timestamp = datetime.now().isoformat()
        # Log the timestamp entry
        with open(self.log_path, 'a') as f:
            f.write(json.dumps({'timestamp': self.current_timestamp}) + '\n')

    def log_operation(self, operation: str,
                     tokens: Optional[int] = None,
                     start_time: Optional[float] = None,
                     is_error: bool = False,
                     memory_usage_before: Optional[int] = None,
                     memory_usage_after: Optional[int] = None,
                     intent: Optional[str] = None,
                     **kwargs) -> None:
        """Log an operation without timestamp."""
        if self.current_timestamp is None:
            self.start_new_question()

        log_entry = {
            'operation': operation,
            'tokens_used': tokens,
            'latency': self._format_number(time.time() - start_time) if start_time else None,
        }
        
        # Add intent information if provided
        if intent:
            log_entry['intent'] = intent

        if tokens:
            self.metrics['total_tokens'] += tokens
        if start_time:
            self.metrics[f'{operation}_times'].append(self._format_number(log_entry['latency']))
        if is_error:
            self.metrics['error_count'] += 1

        if memory_usage_before is not None and memory_usage_after is not None:
            memory_delta = (memory_usage_after - memory_usage_before) / self.BYTES_TO_KB
            log_entry['memory_usage_delta'] = self._format_number(memory_delta)
            self.metrics['memory_utilization']['memory_usage'].append(self._format_number(memory_delta))

        if operation == 'retrieval':
            sources = kwargs.get('sources', [])
            for source in sources:
                self.metrics['source_usage'][source] += 1
                
        # Track intent usage for analytics
        if intent:
            self.metrics['intent_usage'][intent] += 1

        if operation in ['generation', 'chain of thought']: #Check if operation in in either of the lists
            question = kwargs.get('question', '')
            context = kwargs.get('context', '')
            response = kwargs.get('response', '')

            if question and context and response: # Check that each of the values are available
                quality_metrics = self.metrics_calculator.get_all_metrics(
                    question, context, response
                )
                formatted_metrics = {
                    k: self._format_number(v) for k, v in quality_metrics.items()
                }

                for metric_name, value in formatted_metrics.items():
                    metric_key = f"{metric_name}s"
                    self.metrics['response_quality_metrics'][metric_key].append(value)

                log_entry['response_quality_metrics'] = formatted_metrics
            else:
                print(f"Skipping quality metrics logging for {operation} due to missing question, context, or response.") #Added print statement,

        with open(self.log_path, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
            
    def log_processing_time(self, processing_time: float) -> None:
        """Log the total processing time and reset timestamp."""
        self.metrics['total_processing_times'].append(self._format_number(processing_time))
        self.current_timestamp = None  # Reset timestamp for next question

    def get_performance_summary(self, memory) -> Dict:
        """Generate a summary of performance metrics."""
        avg_quality_metrics = {}
        for metric_name, values in self.metrics['response_quality_metrics'].items():
            if values:
                avg = self._format_number(sum(values) / len(values))
            else:
                avg = 0.00
            avg_quality_metrics[f'average_{metric_name[:-1]}'] = avg

        # Gather memory utilization metrics
        cpu_utilization = self.memory_metrics.get_cpu_utilization()
        memory_usage = self.memory_metrics.get_memory_usage()
        embedding_size = self.memory_metrics.get_total_embedding_size()

        summary = {
            'Performance Summary': {
                'average_retrieval_time': self._format_number(self._calculate_average('retrieval_times')),
                'average_validation_time': self._format_number(self._calculate_average('validation_times')),
                'average_generation_time': self._format_number(self._calculate_average('generation_times')),
                'total_tokens_processed': self.metrics['total_tokens'],
                'total_processing_time': self._format_number(sum(self.metrics['total_processing_times'])),
                'error_count': self.metrics['error_count'],
                'average_response_quality_metrics': avg_quality_metrics
            },
            'Memory Usage': {
                'cpu_utilization': cpu_utilization,
                'memory_usage': self._format_number(memory_usage),
                'embedding_size': self._format_number(embedding_size)
            },
            'Source Usage': dict(self.metrics['source_usage']),
            'Intent Usage': dict(self.metrics['intent_usage'])
        }

        with open(self.log_path, 'a') as f:
            f.write(json.dumps(summary) + '\n\n')

        self._reset_metrics()

    def _calculate_average(self, metric_key: str) -> float:
        """Helper method to calculate averages for metric lists."""
        values = self.metrics[metric_key]
        return sum(values)/len(values) if values else 0.00

    def _reset_metrics(self) -> None:
        """Reset all metrics for the next cycle."""
        self.metrics['total_processing_times'] = []