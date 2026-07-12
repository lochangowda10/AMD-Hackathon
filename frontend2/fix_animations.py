import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Fix motion-variants.ts
f1 = 'src/lib/motion-variants.ts'
motion_replacements = [
    ('whileHover:', 'hover:'),
    ('whileTap:', 'tap:')
]
replace_in_file(f1, motion_replacements)

# Now specifically fix pulse which broke because of the above replace, and needs to be hidden/visible
with open(f1, 'r', encoding='utf-8') as f:
    content = f.read()

pulse_old = """  pulse: {
    hover: { scale: [1, 1.05, 1] },
    transition: { repeat: Infinity, duration: 2 }
  },"""
pulse_new = """  pulse: {
    hidden: { scale: 1 },
    visible: { 
      scale: [1, 1.05, 1],
      transition: { repeat: Infinity, duration: 2 }
    }
  },"""
content = content.replace(pulse_old, pulse_new)

with open(f1, 'w', encoding='utf-8') as f:
    f.write(content)

# Fix MarketMemory.tsx to include the trigger props
f2 = 'src/components/dashboard/MarketMemory.tsx'
mm_replacements = [
    ('variants={motionVariants.pop3d}', 'variants={motionVariants.pop3d}\n              whileHover="hover"\n              whileTap="tap"')
]
replace_in_file(f2, mm_replacements)

print("Done fixing animations!")
