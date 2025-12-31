import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain.schema import Document
import fitz
from tqdm.auto import tqdm
import re
import requests

from config import Config


HUGGINGFACEHUB_API_TOKEN = Config.HF_TOKEN
if HUGGINGFACEHUB_API_TOKEN is None:
    raise ValueError("HF_TOKEN not found in the .env file or the file path is incorrect")
os.environ["HUGGINGFACEHUB_API_TOKEN"] = HUGGINGFACEHUB_API_TOKEN

# Initialize the Hugging Face embeddings
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-l6-v2")


# Function to format text
def text_formatter(text: str) -> str:
    return re.sub(r'\s+', ' ', text).strip()

# Function to open and read a PDF
def open_and_read_pdf(pdf_path: str) -> list:
    doc = fitz.open(pdf_path)
    medical_content = []
    for page_number, page in tqdm(enumerate(doc), total=doc.page_count, desc=f"Reading {os.path.basename(pdf_path)}"):
        text = page.get_text()
        cleaned_text = text_formatter(text)
        if cleaned_text:  # Skip empty pages
            medical_content.append({
                "page_number": page_number,
                "page_char_count": len(cleaned_text),
                "page_word_count": len(cleaned_text.split()),
                "page_sentence_count_raw": len(cleaned_text.split('. ')),
                "page_token_count": len(cleaned_text) // 4,
                "text": cleaned_text
            })
    return medical_content

# Split text into chunks
def split_text_into_chunks(medical_content):
    text_splitter = CharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        length_function=len,
        add_start_index=True
    )
    for item in medical_content:
        chunks = text_splitter.split_text(item["text"])
        item["chunks"] = [chunk for chunk in chunks if chunk.strip()]  # Skip empty chunks

# Function to split a list into smaller chunks
def split_list(lst, chunk_size):
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]

# Read all PDFs in a folder
def read_all_pdfs_in_folder(folder_path):
    all_medical_content = []
    for filename in os.listdir(folder_path):
        if filename.endswith(".pdf"):
            pdf_path = os.path.join(folder_path, filename)
            medical_content = open_and_read_pdf(pdf_path)
            split_text_into_chunks(medical_content)
            # Store pdf_path in medical_content for each item
            for item in medical_content:
                item['pdf_path'] = pdf_path  # Store the PDF path here
            all_medical_content.extend(medical_content)
    return all_medical_content

# Main folder path containing the PDFs
folder_path = '../main_dataset'
medical_content = read_all_pdfs_in_folder(folder_path)

# Create documents from the medical content
documents = []
for item in medical_content:
    for chunk in item.get("chunks", []):
        # Create the metadata dictionary
        metadata = {
            "source": os.path.basename(item.get("pdf_path", "Unknown")),  # Extract filename from path
            "page_number": item.get("page_number", "Unknown")
        }
        documents.append(Document(page_content=chunk, metadata=metadata)) #Pass metadata

# Split documents into smaller chunks to avoid payload size limit
chunk_size = 10  # Adjust the chunk size if necessary
document_chunks = list(split_list(documents, chunk_size))

# Initialize the vector database without the embeddings
vectordb3 = None

# Process and add documents to the vector database
for i, doc_chunk in enumerate(document_chunks):
    print(f"Processing chunk {i+1}/{len(document_chunks)}...")
    try:
        # Create or add to the vector database
        if vectordb3 is None:
            vectordb3 = Chroma.from_documents(
                documents=doc_chunk,
                embedding=embeddings,
                persist_directory='../vectordb3/chroma/'
            )
        else:
            vectordb3.add_documents(doc_chunk)
    except KeyError as e:
        print(f"KeyError in chunk {i+1}: {e}. Skipping this chunk.")
        continue
    except requests.exceptions.JSONDecodeError as e:
        print(f"JSON Decode Error in chunk {i+1}: {e}")
        continue
    except Exception as e:
        print(f"Error processing chunk {i+1}: {e}")
        continue

print("Vector database creation complete.")
