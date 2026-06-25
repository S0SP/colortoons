import json
from pathlib import Path

data = json.loads(Path('.graphify_detect.json').read_text())
total_files = data.get('total_files', 0)
total_words = data.get('total_words', 0)
print(f'Corpus: {total_files} files · ~{total_words} words')

files_dict = data.get('files', {})
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
if data.get('skipped_sensitive'):
    print(f'  skipped: {len(data.get("skipped_sensitive", []))} sensitive files')
