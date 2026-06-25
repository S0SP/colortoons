#!/usr/bin/env python3
"""
Create subagent chunks for semantic extraction
"""
import json
from pathlib import Path

output_dir = Path(".graphify_out")
semantic_files = json.loads(output_dir.joinpath(".graphify_semantic_files.json").read_text())

all_files = semantic_files['docs'] + semantic_files['images'] + semantic_files['papers']

# Split into chunks of ~22 files
chunk_size = 22
chunks = []
for i in range(0, len(all_files), chunk_size):
    chunk = all_files[i:i+chunk_size]
    chunks.append(chunk)

print(f"📦 Splitting {len(all_files)} files into {len(chunks)} chunks\n")

# Generate chunk data for dispatch
for chunk_idx, chunk in enumerate(chunks, 1):
    chunk_data = {
        "chunk_num": chunk_idx,
        "total_chunks": len(chunks),
        "files": chunk,
        "file_count": len(chunk)
    }
    output_dir.joinpath(f".graphify_chunk_{chunk_idx}.input.json").write_text(json.dumps(chunk_data, indent=2))
    
    print(f"✓ Chunk {chunk_idx}/{len(chunks)}: {len(chunk)} files")
    for f in chunk[:3]:  # Show first 3
        print(f"    - {f}")
    if len(chunk) > 3:
        print(f"    ... and {len(chunk)-3} more")

print(f"\n📤 Ready to dispatch {len(chunks)} subagent(s)")
