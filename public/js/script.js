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

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalBrand = document.getElementById('modal-brand');
  const modalDesc = document.getElementById('modal-desc');
  const modalClose = document.getElementById('modal-close');

  document.querySelectorAll('.shoe-card').forEach(card => {
    card.addEventListener('click', () => {
      modalImg.src = card.dataset.image;
      modalTitle.textContent = card.dataset.title;
      modalBrand.textContent = card.dataset.brand || '';
      modalDesc.textContent = card.dataset.desc || '';
      modal.classList.add('active');
    });
  });

  modalClose.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
});