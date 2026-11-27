/**
 * Small color helpers shared by the VS Code workspace colors and the tag colors.
 *
 * @example
 * hslToHex(0, 1, 0.5) // '#FF0000'
 * foregroundOn('#FFFFFF') // '#000000'
 */

/**
 * Converts an HSL color to a `#RRGGBB` string.
 *
 * @param hue - 0 to 360.
 * @param saturation - 0 to 1.
 * @param lightness - 0 to 1.
 */
export function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const offset = lightness - chroma / 2
  const [r, g, b] =
    hue < 60
      ? [chroma, x, 0]
      : hue < 120
        ? [x, chroma, 0]
        : hue < 180
          ? [0, chroma, x]
          : hue < 240
            ? [0, x, chroma]
            : hue < 300
              ? [x, 0, chroma]
              : [chroma, 0, x]
  const channel = (value: number): string =>
    Math.round((value + offset) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  return `#${channel(r!)}${channel(g!)}${channel(b!)}`
}

/**
 * Gives the readable text color on a background: black on a light one, white on a dark one.
 *
 * @param hex - the background, `#RRGGBB`.
 */
export function foregroundOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
  // Perceived brightness (ITU-R BT.601).
  return (r! * 299 + g! * 587 + b! * 114) / 1000 > 140 ? '#000000' : '#FFFFFF'
}
