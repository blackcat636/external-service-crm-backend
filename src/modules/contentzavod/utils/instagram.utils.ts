export function isValidInstagramURL(url: string): boolean {
  const instagramPattern = /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/;
  return instagramPattern.test(url);
}
