import json
from graphify.detect import detect
from pathlib import Path

result = detect(Path('.'))
Path('.graphify_detect.json').write_text(json.dumps(result, indent=2))

# Display summary
total_files = result.get('total_files', 0)
total_words = result.get('total_words', 0)
print(f'Corpus: {total_files} files · ~{total_words} words')

files_dict = result.get('files', {})
if files_dict.get('code'):
    print(f'  code:     {len(files_dict.get("code", []))} files')
if files_dict.get('document'):
    print(f'  docs:     {len(files_dict.get("document", []))} files')
if files_dict.get('paper'):
    print(f'  papers:   {len(files_dict.get("paper", []))} files')
if files_dict.get('image'):
    print(f'  images:   {len(files_dict.get("image", []))} files')
if files_dict.get('video'):
    print(f'  video:    {len(files_dict.get("video", []))} files')
if result.get('skipped_sensitive'):
    print(f'  skipped: {len(result.get("skipped_sensitive", []))} sensitive files')
