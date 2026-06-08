function sortShoes() {
  const val = document.getElementById('sortSelect').value;
  const gallery = document.getElementById('gallery');
  const cards = Array.from(gallery.querySelectorAll('.shoe-card'));

  cards.sort((a, b) => {
    if (val === 'newest') return b.dataset.id - a.dataset.id;
    if (val === 'oldest') return a.dataset.id - b.dataset.id;
    if (val === 'brand') return (a.dataset.brand || '').localeCompare(b.dataset.brand || '');
    if (val === 'featured') return b.dataset.featured - a.dataset.featured;
  });

  cards.forEach(card => gallery.appendChild(card));
}