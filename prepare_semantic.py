#!/usr/bin/env python3
"""
Semantic extraction dispatcher for graphify
"""
import json
from pathlib import Path

output_dir = Path(".graphify_out")
output_dir.mkdir(exist_ok=True)

# Load detection results
detect_data = json.loads(output_dir.joinpath(".graphify_detect.json").read_text())

# Collect all non-code files
docs = detect_data.get('files', {}).get('document', [])
images = detect_data.get('files', {}).get('image', [])
papers = detect_data.get('files', {}).get('paper', [])

all_non_code = docs + images + papers

print(f"📚 Semantic extraction targets:")
print(f"   Documents: {len(docs)}")
print(f"   Images: {len(images)}")
print(f"   Papers: {len(papers)}")
print(f"   Total: {len(all_non_code)} files\n")

# Write file list for subagents
if all_non_code:
    output_dir.joinpath(".graphify_semantic_files.json").write_text(json.dumps({
        'docs': docs,
        'images': images,
        'papers': papers,
        'total': len(all_non_code)
    }, indent=2))
    
    # Calculate chunk size and estimate
    chunk_size = 22
    num_chunks = (len(all_non_code) + chunk_size - 1) // chunk_size
    print(f"🔄 Estimated subagents needed: {num_chunks}")
    print(f"⏱️  Estimated time: ~45s per batch")
else:
    print("ℹ️  Code-only corpus (no docs/images to extract)")
