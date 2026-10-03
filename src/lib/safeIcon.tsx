import type { ComponentType, SVGProps } from 'react';
import { Circle } from 'lucide-react';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

export function isRenderableComponent(candidate: unknown): candidate is ComponentType<IconProps> {
  return typeof candidate === 'function';
}

/** Safe dynamic Lucide/component lookup — never returns undefined. */
export function asIcon(candidate: unknown, fallback: ComponentType<IconProps> = Circle): ComponentType<IconProps> {
  return isRenderableComponent(candidate) ? candidate : fallback;
}

/** Never render an undefined Lucide/dynamic tag (invalidtagname / element-type runtime crash). */
export function SafeIcon({
  icon: Icon,
  fallback: Fallback = Circle,
  ...props
}: {
  icon?: unknown;
  fallback?: ComponentType<IconProps>;
} & IconProps) {
  if (isRenderableComponent(Icon)) return <Icon {...props} />;
  if (isRenderableComponent(Fallback)) return <Fallback {...props} />;
  return null;
}
