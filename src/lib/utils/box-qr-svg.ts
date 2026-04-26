import QRCode from "qrcode";

/** SVG string for print/screen; encodes `boxCode` exactly (payload is the plain box_code). */
export function boxCodeToQrSvg(boxCode: string): Promise<string> {
  return QRCode.toString(boxCode, {
    type: "svg",
    margin: 1,
    width: 280,
    errorCorrectionLevel: "M",
  });
}
