# Génère la voix Liam (eleven_v3) par blocs de paragraphes : python3 tts.py 0 1 2 ...
import sys, json, urllib.request
P = [p for p in open('histoire.txt').read().split('\n') if p.strip()]
B = [P[0:6], P[6:13]]
for i in map(int, sys.argv[1:]):
    body = json.dumps({'text': '\n'.join(B[i]), 'model_id': 'eleven_v3', 'language_code': 'fr', 'voice_settings': {'stability': 0.0, 'similarity_boost': 0.8}}).encode()
    q = urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/TX3LPaxmHKxFdv7VOQHJ?output_format=mp3_44100_128', body, {'xi-api-key': 'proxy-injected', 'Content-Type': 'application/json'})
    open(f'voix_{i}.mp3', 'wb').write(urllib.request.urlopen(q, timeout=300).read()); print('ok', i, len(body))
