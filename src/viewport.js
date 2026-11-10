// Canvas의 실제 크기를 조절합니다. 별도 CSS나 인라인 스타일은 사용하지 않습니다.
export function getBoardLayout(width, height, compact) {
  const landscape = compact && width > height;
  const availableWidth = landscape ? width / 2 - 64 : compact ? width - 64 : width / 2 - 64;
  const availableHeight = compact ? height - (landscape ? 100 : 320) : height - 230;
  const cell = Math.max(8, Math.min(30, Math.floor(availableWidth / 10), Math.floor(availableHeight / 20)));
  return { landscape, width: cell * 10, height: cell * 20 };
}
