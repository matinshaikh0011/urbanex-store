import re

with open('frontend/src/app/admin/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Map of corrupted sequences -> clean replacements
replacements = [
    # NAV icons
    ('\u00f0\u009f\u0094\u008a', '◈'),   # 📊
    ('\u00f0\u009f\u0094\u00a6', '◉'),   # 📦
    ('\u00f0\u009f\u0091\u009f', '▣'),   # 👟
    ('\u00f0\u009f\u00b7\u00ef\u00b8\u008f', '◆'),  # 🏷️
    ('\u00f0\u009f\u008e\u009f\u00ef\u00b8\u008f', '◇'),  # 🎟️
    ('\u00f0\u009f\u0094\u0088', '▲'),   # 📈
    ('\u00f0\u009f\u0094\u00a5', '▼'),   # 📥
    ('\u00f0\u009f\u0095\u00b7', '✦'),   # 🕷
    # Hamburger menu
    ('\u00e2\u0098\u00b0', '\u2261'),     # ☰ -> ≡
    # Logout power icon
    ('\u00e2\u008f\u00bb', '\u23fb'),     # ⏻
    # Order action icons
    ('\u00f0\u009f\u0094\u009d', '\u270e'),  # 📝 -> ✎
    ('\u00f0\u009f\u0091\u0081', '\u25ce'),  # 👁 -> ◎
    ('\u00f0\u009f\u0092\u00ac', '\u2709'),  # 💬 -> ✉
    ('\u00f0\u009f\u0097\u0091', '\u2715'),  # 🗑 -> ✕
    # Featured star
    ('\u00e2\u0098\u0085', '\u2605'),     # ★
    ('\u00e2\u0098\u0086', '\u2606'),     # ☆
    # Em dash
    ('\u00e2\u0080\u0094', '\u2014'),     # —
    # Box drawing
    ('\u00e2\u0094\u0080', '\u2500'),     # ─
]

for bad, good in replacements:
    content = content.replace(bad, good)

with open('frontend/src/app/admin/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
