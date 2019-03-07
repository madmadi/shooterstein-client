export function isFullyContained (parent, child) {
  if (parent.width <= child.width
    || parent.height <= child.height) return false;

  return Math.sqrt(
    (parent.position.x - child.position.x) * (parent.position.x - child.position.x)
    + (parent.position.y - child.position.y) * (parent.position.y - child.position.y),
  ) < (parent.width / 2) - (child.width / 2);
}
