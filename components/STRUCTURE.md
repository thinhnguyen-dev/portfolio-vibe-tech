# Components Folder Structure

This document describes the reorganized component structure following feature-based and common/shared organization patterns.

## Folder Structure

```
components/
├── common/                    # Reusable UI components
│   ├── Button.tsx
│   ├── Logo.tsx
│   ├── NavLink.tsx
│   ├── SectionHeader.tsx
│   ├── ThemeSwitcher.tsx
│   ├── TypingText.tsx
│   └── index.ts              # Exports all common components
│
├── features/                  # Feature-specific components
│   ├── home/                 # Home page components
│   │   ├── HeroLogo.tsx
│   │   ├── DotsPattern.tsx
│   │   ├── StatusBar.tsx
│   │   ├── Quote.tsx
│   │   └── index.ts
│   │
│   ├── about/                # About page components
│   │   ├── BioText.tsx
│   │   ├── SkillBlock.tsx
│   │   ├── FactsGrid.tsx
│   │   ├── FactCard.tsx
│   │   └── index.ts
│   │
│   ├── achievements/         # Achievements page components
│   │   ├── Timeline.tsx
│   │   └── index.ts
│   │
│   └── contact/              # Contact section component
│       ├── Contact.tsx
│       └── index.ts
│
├── layout/                    # Layout components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── SocialMediaLinks.tsx
│   ├── GoToTop.tsx
│   └── index.ts              # Exports all layout components
│
└── index.ts                   # Main export file (re-exports all)

```

## Import Examples

### Common Components

These components can be used across any feature:

```tsx
// Option 1: Import from common directly
import { Button, Logo, NavLink, SectionHeader, ThemeSwitcher, TypingText } from '@/components/common';

// Option 2: Import individual components
import { Button } from '@/components/common/Button';
import { Logo } from '@/components/common/Logo';
import { SectionHeader } from '@/components/common/SectionHeader';
```

### Feature Components

#### Home Page Components

```tsx
// Import all home components
import { HeroLogo, DotsPattern, StatusBar, Quote } from '@/components/features/home';

// Or import individually
import { HeroLogo } from '@/components/features/home/HeroLogo';
import { Quote } from '@/components/features/home/Quote';
```

#### About Page Components

```tsx
// Import all about components
import { BioText, SkillBlock, FactsGrid, FactCard } from '@/components/features/about';

// Or import individually
import { BioText } from '@/components/features/about/BioText';
import { SkillBlock } from '@/components/features/about/SkillBlock';
import { FactsGrid } from '@/components/features/about/FactsGrid';
```

#### Achievements Page Components

```tsx
// Import Timeline component and type
import { Timeline } from '@/components/features/achievements';
import type { TimelineItem } from '@/components/features/achievements';

// Or import from specific file
import { Timeline, TimelineItem } from '@/components/features/achievements/Timeline';
```

#### Contact Component

```tsx
// Import contact component
import { Contact } from '@/components/features/contact';

// Or from specific file
import { Contact } from '@/components/features/contact/Contact';
```

### Layout Components

```tsx
// Import all layout components
import { Header, Footer, SocialMediaLinks, GoToTop, SocialIcon } from '@/components/layout';

// Or import individually
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GoToTop } from '@/components/layout/GoToTop';
```

### Convenience Import (All Components)

For convenience, you can import from the main index:

```tsx
// Import from main index (not recommended for tree-shaking)
import { Button, Header, Footer, Quote, Contact } from '@/components';
```

## Component Categories

### Common/Shared Components

These components are reusable across different features:

- **Button**: Generic button component with variants
- **Logo**: Application logo component
- **NavLink**: Navigation link component
- **SectionHeader**: Section header with hash and line
- **ThemeSwitcher**: Theme toggle (light/dark mode)
- **TypingText**: Text typing animation component

### Feature Components

#### Home Feature (`features/home/`)
- **HeroLogo**: Large logo for hero section
- **DotsPattern**: Decorative dots pattern
- **StatusBar**: Status message bar
- **Quote**: Quote display component

#### About Feature (`features/about/`)
- **BioText**: Biography text paragraph component
- **SkillBlock**: Skills category block
- **FactsGrid**: Grid layout for fun facts
- **FactCard**: Individual fact card

#### Achievements Feature (`features/achievements/`)
- **Timeline**: Timeline component for achievements
- **TimelineItem**: Type definition for timeline items

#### Contact Feature (`features/contact/`)
- **Contact**: Contact section component

### Layout Components

These components are used for page structure:

- **Header**: Site header with navigation
- **Footer**: Site footer
- **SocialMediaLinks**: Fixed social media sidebar
- **GoToTop**: Scroll-to-top button

## Best Practices

1. **Import from index files**: Use index.ts exports for cleaner imports
   ```tsx
   import { Button } from '@/components/common';  // ✅ Good
   import { Button } from '@/components/common/Button';  // Also OK
   ```

2. **Feature-specific imports**: Import feature components from their feature folder
   ```tsx
   import { Quote } from '@/components/features/home';  // ✅ Good
   ```

3. **Type imports**: Use `import type` for TypeScript types
   ```tsx
   import type { TimelineItem } from '@/components/features/achievements';
   ```

4. **Layout components**: Import layout components from layout folder
   ```tsx
   import { Header, Footer } from '@/components/layout';
   ```

5. **Avoid main index for production**: Import from specific folders for better tree-shaking

## Migration Notes

All imports have been updated to use the new structure. The old flat structure (`@/components/ComponentName`) has been replaced with the new organized structure.

### Old Import Pattern
```tsx
import { Button } from '@/components/Button';
import { Quote } from '@/components/Quote';
import { Header } from '@/components/Header';
```

### New Import Pattern
```tsx
import { Button } from '@/components/common';
import { Quote } from '@/components/features/home';
import { Header } from '@/components/layout';
```

## File Locations Reference

| Component | Old Path | New Path |
|-----------|----------|----------|
| Button | `components/Button.tsx` | `components/common/Button.tsx` |
| Logo | `components/Logo.tsx` | `components/common/Logo.tsx` |
| Header | `components/Header.tsx` | `components/layout/Header.tsx` |
| Footer | `components/Footer.tsx` | `components/layout/Footer.tsx` |
| Quote | `components/Quote.tsx` | `components/features/home/Quote.tsx` |
| Contact | `components/Contact.tsx` | `components/features/contact/Contact.tsx` |
| Timeline | `components/Timeline.tsx` | `components/features/achievements/Timeline.tsx` |
| BioText | `components/BioText.tsx` | `components/features/about/BioText.tsx` |
| SkillBlock | `components/SkillBlock.tsx` | `components/features/about/SkillBlock.tsx` |

