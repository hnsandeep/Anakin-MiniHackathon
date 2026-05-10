"""
Build a local FAISS index from llms-full.txt (optional RAG setup).
Requires: pip install langchain langchain-community langchain-openai faiss-cpu tiktoken
"""

from pathlib import Path

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DOCS = HERE / "llms-full.txt"
OUT = ROOT / "vectorstore" / "anakin"


def main() -> None:
    loader = TextLoader(str(DOCS), encoding="utf-8")
    docs = loader.load()
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = splitter.split_documents(docs)
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    vectorstore = FAISS.from_documents(chunks, embeddings)
    OUT.mkdir(parents=True, exist_ok=True)
    vectorstore.save_local(str(OUT))
    print("Anakin skill knowledge base created at", OUT)


if __name__ == "__main__":
    main()
