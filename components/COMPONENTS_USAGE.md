# Reusable Components Usage Guide

This document provides examples and usage patterns for the reusable components used across the portfolio website.

## Table of Contents

1. [SectionHeader](#sectionheader)
2. [BioText](#biotext)
3. [SkillBlock](#skillblock)
4. [FactCard](#factcard)
5. [FactsGrid](#factsgrid)

---

## SectionHeader

A reusable section header component with a hash symbol, title, and decorative line.

### Props

- `title` (string, required): The section title text
- `className` (string, optional): Additional CSS classes
- `showHash` (boolean, optional, default: `true`): Show/hide the `#` symbol
- `variant` ('default' | 'motion', optional, default: 'default'): Render with or without Framer Motion
- `variants` (object, optional): Framer Motion variants object (required when `variant='motion'`)

### Basic Usage

```tsx
import { SectionHeader } from '@/components/SectionHeader';

// Simple usage
<SectionHeader title="about-me" />

// Without hash symbol
<SectionHeader title="about-me" showHash={false} />

// With Framer Motion animation
<SectionHeader
  title="skills"
  variant="motion"
  variants={itemVariants}
/>
```

### Example in a Section

```tsx
<motion.section
  className="container mx-auto px-4 py-8"
  variants={containerVariants}
  initial="hidden"
  whileInView="visible"
>
  <SectionHeader
    title="about-me"
    variant="motion"
    variants={itemVariants}
  />
  
  {/* Section content */}
</motion.section>
```

---

## BioText

A reusable text paragraph component with consistent typography for bio/about content.

### Props

- `children` (ReactNode, required): The text content
- `className` (string, optional): Additional CSS classes
- `variant` ('default' | 'motion', optional, default: 'default'): Render with or without Framer Motion
- `variants` (object, optional): Framer Motion variants object (required when `variant='motion'`)

### Basic Usage

```tsx
import { BioText } from '@/components/BioText';

// Simple usage
<BioText>
  Hello, I'm Yourname!
</BioText>

// With Framer Motion animation
<BioText variant="motion" variants={itemVariants}>
  I'm a self-taught front-end developer based in Kyiv, Ukraine.
</BioText>

// Multiple paragraphs with spacing
<div className="space-y-6">
  <BioText variant="motion" variants={itemVariants}>
    First paragraph
  </BioText>
  <BioText variant="motion" variants={itemVariants}>
    Second paragraph
  </BioText>
</div>
```

---

## SkillBlock

A reusable component for displaying skill categories (Languages, Tools, etc.) with a title, separator line, and skill items in rows.

### Props

- `title` (string, required): The skill category title
- `skills` (string[][], required): Array of skill rows, where each row is an array of skill names
- `className` (string, optional): Additional CSS classes
- `width` (string, optional, default: '192px'): Width of the skill block
- `variant` ('default' | 'motion', optional, default: 'default'): Render with or without Framer Motion
- `variants` (object, optional): Framer Motion variants object (required when `variant='motion'`)

### Basic Usage

```tsx
import { SkillBlock } from '@/components/SkillBlock';

// Simple usage
<SkillBlock
  title="Languages"
  skills={[['TypeScript', 'Lua'], ['Python', 'JavaScript']]}
/>

// With custom width
<SkillBlock
  title="Tools"
  skills={[['VSCode', 'Figma'], ['Git', 'Docker']]}
  width="240px"
/>

// Multiple skill blocks in a grid
<div className="flex flex-wrap gap-4">
  <SkillBlock
    title="Languages"
    skills={[['TypeScript'], ['JavaScript', 'Python']]}
    width="192px"
  />
  <SkillBlock
    title="Tools"
    skills={[['VSCode'], ['Git']]}
    width="192px"
  />
</div>
```

### Skills Array Format

The `skills` prop expects an array of rows, where each row contains skill names:

```tsx
// Example: 2 rows, 2 items each
skills={[['TypeScript', 'Lua'], ['Python', 'JavaScript']]}

// Example: 3 rows with varying items
skills={[
  ['HTML', 'CSS'],
  ['JavaScript', 'TypeScript', 'Python'],
  ['React', 'Next.js']
]}
```

---

## FactCard

A reusable component for displaying individual fact items in a bordered card.

### Props

- `text` (string, required): The fact text content
- `className` (string, optional): Additional CSS classes
- `variant` ('default' | 'motion', optional, default: 'default'): Render with or without Framer Motion
- `variants` (object, optional): Framer Motion variants object (required when `variant='motion'`)
- `whileHover` (object, optional): Framer Motion hover animation properties

### Basic Usage

```tsx
import { FactCard } from '@/components/FactCard';

// Simple usage
<FactCard text="I like winter more than summer" />

// With hover effect
<FactCard
  text="I'm a night owl"
  variant="motion"
  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
/>

// In a grid layout
<div className="flex flex-wrap gap-4">
  <FactCard text="Fact 1" />
  <FactCard text="Fact 2" />
  <FactCard text="Fact 3" />
</div>
```

---

## FactsGrid

A reusable component that automatically arranges facts in a grid layout (2 per row).

### Props

- `facts` (string[], required): Array of fact texts
- `className` (string, optional): Additional CSS classes
- `maxWidth` (string, optional, default: '605px'): Maximum width of the grid
- `gap` ('2' | '3' | '4' | '6' | '8', optional, default: '4'): Gap between items and rows
- `variant` ('default' | 'motion', optional, default: 'default'): Render with or without Framer Motion
- `variants` (object, optional): Framer Motion variants object (required when `variant='motion'`)

### Basic Usage

```tsx
import { FactsGrid } from '@/components/FactsGrid';

// Simple usage
<FactsGrid
  facts={[
    'I like winter more than summer',
    'I\'m afraid of heights but love flying',
    'I can solve a Rubik\'s cube',
    'I love to read science fiction novels',
  ]}
/>

// With custom styling
<FactsGrid
  facts={factsArray}
  maxWidth="700px"
  gap="6"
  className="mt-8"
/>

// With Framer Motion
<FactsGrid
  facts={factsArray}
  variant="motion"
  variants={itemVariants}
/>
```

### Automatic Layout

The component automatically groups facts into rows of 2. If you have an odd number of facts, the last row will contain a single item:

```tsx
// 7 facts will create 4 rows: [2, 2, 2, 1]
<FactsGrid
  facts={[
    'Fact 1',
    'Fact 2',
    'Fact 3',
    'Fact 4',
    'Fact 5',
    'Fact 6',
    'Fact 7',
  ]}
/>
```

---

## Complete Example: About Page

Here's a complete example showing how these components work together:

```tsx
'use client';

import { motion } from 'framer-motion';
import { SectionHeader } from '@/components/SectionHeader';
import { BioText } from '@/components/BioText';
import { SkillBlock } from '@/components/SkillBlock';
import { FactsGrid } from '@/components/FactsGrid';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function About() {
  return (
    <main className="min-h-screen">
      {/* About Section */}
      <motion.section
        className="container mx-auto px-4 py-8"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <SectionHeader
          title="about-me"
          variant="motion"
          variants={itemVariants}
        />

        <div className="space-y-6">
          <BioText variant="motion" variants={itemVariants}>
            Hello, I'm Yourname!
          </BioText>
          <BioText variant="motion" variants={itemVariants}>
            I'm a self-taught front-end developer.
          </BioText>
        </div>
      </motion.section>

      {/* Skills Section */}
      <motion.section
        className="container mx-auto px-4 py-8"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
      >
        <SectionHeader
          title="skills"
          variant="motion"
          variants={itemVariants}
        />

        <motion.div
          className="flex flex-wrap gap-4"
          variants={itemVariants}
        >
          <SkillBlock
            title="Languages"
            skills={[['TypeScript', 'Lua'], ['Python', 'JavaScript']]}
          />
          <SkillBlock
            title="Tools"
            skills={[['VSCode', 'Figma'], ['Git', 'Docker']]}
          />
        </motion.div>
      </motion.section>

      {/* Facts Section */}
      <motion.section
        className="container mx-auto px-4 py-8"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
      >
        <SectionHeader
          title="My facts"
          variant="motion"
          variants={itemVariants}
        />

        <FactsGrid
          facts={[
            'I like winter more than summer',
            'I can solve a Rubik\'s cube',
            'I\'m a night owl',
          ]}
        />
      </motion.section>
    </main>
  );
}
```

---

## Styling Customization

All components accept a `className` prop for additional styling:

```tsx
<SectionHeader
  title="custom-title"
  className="mb-12" // Custom margin
/>

<BioText className="text-lg">Custom styled text</BioText>

<SkillBlock
  title="Languages"
  skills={[['TypeScript']]}
  className="border-2" // Custom border
/>
```

---

## Accessibility

All components follow accessibility best practices:

- Semantic HTML elements
- Proper heading hierarchy
- Theme-aware colors
- Responsive design
- ARIA-friendly structure

---

## Notes

- Components use TailwindCSS utility classes
- Colors are theme-aware (light/dark mode)
- All components are fully responsive
- Framer Motion support is optional but recommended for smooth animations
- Components follow Figma design specifications

