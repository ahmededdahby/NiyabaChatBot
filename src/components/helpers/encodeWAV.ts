import { convertFloat32To16BitPCM } from "./convertFloat32To16BitPCM";

export const encodeWAV = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
  const pcmBuffer = convertFloat32To16BitPCM(samples);
  const buffer = new ArrayBuffer(44 + pcmBuffer.byteLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcmBuffer.byteLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, pcmBuffer.byteLength, true);

  const pcmView = new Uint8Array(pcmBuffer);
  for (let i = 0; i < pcmView.length; i++) {
    view.setUint8(44 + i, pcmView[i]);
  }

  return buffer;
};