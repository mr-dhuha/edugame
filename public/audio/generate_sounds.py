import wave
import struct
import math
import os

def generate_tone(filename, frequency=440.0, duration=0.5, volume=32767.0, sample_rate=44100.0, wave_type='sine'):
    path = os.path.join(os.path.dirname(__file__), filename)
    with wave.open(path, 'w') as wav_file:
        wav_file.setnchannels(1) # Mono
        wav_file.setsampwidth(2) # 2 bytes per sample (16 bit)
        wav_file.setframerate(sample_rate)
        
        for i in range(int(duration * sample_rate)):
            t = float(i) / sample_rate
            if wave_type == 'sine':
                value = math.sin(2.0 * math.pi * frequency * t)
            elif wave_type == 'square':
                value = 1.0 if math.sin(2.0 * math.pi * frequency * t) > 0 else -1.0
            elif wave_type == 'sawtooth':
                value = 2.0 * (t * frequency - math.floor(t * frequency + 0.5))
            else:
                value = 0.0
            
            # Simple envelope to avoid clicking
            env = 1.0
            if i < 441: env = i / 441.0
            elif i > (duration * sample_rate) - 441: env = ((duration * sample_rate) - i) / 441.0
            
            data = struct.pack('<h', int(value * volume * env))
            wav_file.writeframesraw(data)

# Click: Short pop
generate_tone('click.ogg', frequency=800.0, duration=0.05, wave_type='square', volume=10000.0)

# Success: Happy chord arpeggio (C E G C)
def generate_success():
    path = os.path.join(os.path.dirname(__file__), 'success.wav')
    with wave.open(path, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(44100)
        
        notes = [523.25, 659.25, 783.99, 1046.50]
        for note in notes:
            for i in range(int(0.15 * 44100)):
                t = float(i) / 44100
                value = math.sin(2.0 * math.pi * note * t)
                env = 1.0 - (i / (0.15 * 44100)) # fade out
                data = struct.pack('<h', int(value * 20000.0 * env))
                wav_file.writeframesraw(data)
generate_success()

# Fail: Sad descending (C B Bb A)
def generate_fail():
    path = os.path.join(os.path.dirname(__file__), 'fail.wav')
    with wave.open(path, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(44100)
        
        notes = [261.63, 246.94, 233.08, 220.00]
        for note in notes:
            for i in range(int(0.2 * 44100)):
                t = float(i) / 44100
                value = math.sin(2.0 * math.pi * note * t) + math.sin(2.0 * math.pi * (note/2) * t)
                env = 1.0 - (i / (0.2 * 44100))
                data = struct.pack('<h', int((value/2.0) * 20000.0 * env))
                wav_file.writeframesraw(data)
generate_fail()

# BGM: Simple background ambiance
generate_tone('bgm.ogg', frequency=220.0, duration=2.0, wave_type='sine', volume=5000.0)

print("Audio files generated successfully!")
