function resolveMimeType(outputFormat) {
  if (outputFormat === 'jpeg') return 'image/jpeg'
  if (outputFormat === 'webp') return 'image/webp'
  return 'image/png'
}

module.exports = {
  resolveMimeType,
}
