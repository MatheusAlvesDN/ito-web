import React from 'react';
import {
  Unlock,
  Star,
  Zap,
  Coffee,
  Film,
  Lightbulb,
  Brain,
  Heart,
  Briefcase,
  Flame,
  Crown,
  Gamepad2,
  Stars,
  Tv,
  Trophy,
  Scroll,
  Music,
  Sparkles,
  HelpCircle,
  MessagesSquare,
  Ghost,
  Languages,
  Shield,
  Smile,
  Compass,
} from 'lucide-react';

const ICON_REGISTRY: Record<string, React.ElementType> = {
  Unlock,
  Star,
  Zap,
  Coffee,
  Film,
  Lightbulb,
  Brain,
  Heart,
  Briefcase,
  Flame,
  Crown,
  Gamepad2,
  Stars,
  Tv,
  Trophy,
  Scroll,
  Music,
  Sparkles,
  HelpCircle,
  MessagesSquare,
  Ghost,
  Languages,
  Shield,
  Smile,
  Compass,
};

export function getIconComponent(iconName?: string | React.ElementType): React.ElementType {
  if (!iconName) return Sparkles;
  if (typeof iconName !== 'string') return iconName;
  return ICON_REGISTRY[iconName] || Sparkles;
}
