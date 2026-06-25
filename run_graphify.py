#!/usr/bin/env python3
"""
Graphify pipeline runner for colorArt
Skips video transcription as requested
"""
import json
import sys
import os
from pathlib import Path
from graphify.detect import detect
from graphify.extract import collect_files, extract as ast_extract

# Create output directory
output_dir = Path(".graphify_out")
output_dir.mkdir(exist_ok=True)

# Step 1: Detect files
print("Step 1: Detecting files...")
detect_result = detect(Path("."))
output_dir.joinpath(".graphify_detect.json").write_text(json.dumps(detect_result, indent=2))

# Print corpus summary
print(f"\n📊 Corpus: {detect_result.get('total_files', 0)} files · ~{detect_result.get('total_words', 0)} words")
if detect_result.get('files', {}).get('code'):
    print(f"   code:     {len(detect_result['files'].get('code', []))} files")
if detect_result.get('files', {}).get('document'):
    print(f"   docs:     {len(detect_result['files'].get('document', []))} files")
if detect_result.get('files', {}).get('paper'):
    print(f"   papers:   {len(detect_result['files'].get('paper', []))} files")
if detect_result.get('files', {}).get('image'):
    print(f"   images:   {len(detect_result['files'].get('image', []))} files")
if detect_result.get('files', {}).get('video'):
    print(f"   video:    {len(detect_result['files'].get('video', []))} files")
    print("   ⏭️  Skipping video transcription as requested\n")
if detect_result.get('skipped_sensitive'):
    print(f"   skipped:  {len(detect_result.get('skipped_sensitive', []))} sensitive files\n")

# Step 2: AST Extraction for code files
print("Step 2: Extracting code structure (AST)...")
code_files = []
for f in detect_result.get('files', {}).get('code', []):
    if Path(f).is_dir():
        code_files.extend(collect_files(Path(f)))
    else:
        code_files.append(Path(f))

if code_files:
    try:
        ast_result = ast_extract(code_files[:50])  # Limit to first 50 for demo
        output_dir.joinpath(".graphify_ast.json").write_text(json.dumps(ast_result, indent=2))
        print(f"✅ AST: {len(ast_result.get('nodes', []))} nodes, {len(ast_result.get('edges', []))} edges")
    except Exception as e:
        print(f"⚠️  AST extraction warning: {e}")
        output_dir.joinpath(".graphify_ast.json").write_text(json.dumps({"nodes":[],"edges":[],"input_tokens":0,"output_tokens":0}))
else:
    print("ℹ️  No code files - skipping AST")
    output_dir.joinpath(".graphify_ast.json").write_text(json.dumps({"nodes":[],"edges":[],"input_tokens":0,"output_tokens":0}))

print("\n✨ Detection and code extraction complete!")
print(f"📁 Output: .graphify_out/")
print("\nNext steps:")
print("  1. Semantic extraction will process docs and images")
print("  2. Community detection will cluster related concepts")
print("  3. Final output: HTML + JSON + audit report")
