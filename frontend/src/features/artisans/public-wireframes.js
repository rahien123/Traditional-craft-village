function photoBanner(file, title) {
  const image = photo(file, title);
  image.className = 'banner';
  image.loading = 'eager';
  return image;
}

function galleryPhoto(file, title) {
  const button = element('button', '', 'gallery-shot');
  button.setAttribute('aria-label', 'Phóng to ' + title);
  button.append(photo(file, title));
  button.onclick = () => {
    const dialog = element('dialog');
    const close = element('button', 'Đóng ảnh');
    close.onclick = () => dialog.close();
    dialog.append(close, photo(file, title));
    dialog.onclose = () => dialog.remove();
    document.body.append(dialog);
    dialog.showModal();
  };
  return button;
}

function cards(items) {
  const grid = element('div', '', 'cards');
  for (const {title, info, path, image} of items) {
    const card = link('', path);
    if (image) card.append(photo(image, title, true));
    else card.append(element('span', 'Chưa có ảnh', 'empty-image'));
    card.append(element('strong', title), element('small', info));
    grid.append(card);
  }
  return grid;
}

function productCards(items) {
  return cards(items.map(({w,p}) => ({
    title:p.name, info:w.name + (p.batch ? ' · Có nhật ký lô' : ''),
    image:p.image, path:'/products/' + p.slug
  })));
}

function workshopCards(items) {
  return cards(items.map(w => ({
    title:w.name, info:w.specialty, image:w.cover, path:'/artisans/' + w.slug
  })));
}

function allProducts() {
  return workshops.flatMap(w => w.products.map(p => ({w,p})));
}

function homePage() {
  const hero = element('section', '', 'hero');
  const featured = allProducts().filter(({p}) => p.featuredOrder).sort((a,b) => a.p.featuredOrder - b.p.featuredOrder);
  const firstWorkshop = workshops[0];
  const copy = element('div');
  copy.append(element('h1','Một vòng qua các xưởng gốm Bát Tràng'),
    element('p','Chọn một xưởng trên bản đồ để nghe chuyện nghề, ngắm từng dáng gốm và lần theo dấu tay người thợ.'),
    link('Bắt đầu từ bản đồ →','/map'));
  const heroLink = link('', '/artisans/' + firstWorkshop.slug);
  heroLink.append(photoBanner(firstWorkshop.cover,'Ghé thăm ' + firstWorkshop.name));
  hero.classList.add('exhibit');
  hero.append(copy,heroLink);
  const journalEntries = allProducts().filter(({p}) => p.batch);
  panel.replaceChildren(hero, element('h2','Ghé xưởng đang đón khách'),
    workshopCards(workshops.filter(w => w.isOpenForVisit)), link('Thăm tất cả các xưởng →','/artisans'),
    element('h2','Từ đất đến khi ra lò'), element('p','Các tác phẩm có nhật ký lô. Chọn một tác phẩm để xem ảnh từng công đoạn tại xưởng.'),productCards(journalEntries),
    element('h2','Tác phẩm nổi bật'), productCards(featured.slice(0,8)),
    link('Xem phòng trưng bày →','/products'),
    element('h2','Tin cộng đồng'), element('p','Hỗ trợ 100% kinh phí gian hàng Triển lãm Làng nghề Quốc tế 2027'));
}

function directoryPage() {
  panel.replaceChildren(element('h1','Xưởng gốm Bát Tràng'), link('Xem trên bản đồ →','/map'), workshopCards(workshops));
}

function selector(label, options) {
  const control = element('select');
  control.setAttribute('aria-label', label);
  control.append(new Option(label,''));
  for (const opt of options) control.append(new Option(opt,opt));
  return control;
}

function catalogPage() {
  const entries = allProducts();
  const search = element('input');
  search.type = 'search';
  search.placeholder = 'Tìm sản phẩm';
  search.setAttribute('aria-label','Tìm sản phẩm');
  const hints = element('datalist');
  hints.id = 'product-hints';
  for (const name of new Set(entries.map(({p}) => p.name))) hints.append(new Option(name));
  search.setAttribute('list',hints.id);
  const shopFilter = selector('Tất cả xưởng',workshops.map(w => w.name));
  const category = selector('Tất cả phân loại',new Set(entries.map(({p}) => p.category)));
  const filters = element('div','','filters');
  filters.append(search,hints,shopFilter,category);
  const results = element('section');
  let page = 0;
  function refresh() {
    const term = search.value.trim().toLocaleLowerCase('vi');
    const matches = entries.filter(({w,p}) => (!shopFilter.value || shopFilter.value === w.name)
      && (!category.value || category.value === p.category) && p.name.toLocaleLowerCase('vi').includes(term));
    results.replaceChildren(element('p',matches.length ? matches.length + ' sản phẩm' : 'Chưa tìm thấy sản phẩm. Hãy thử từ khóa hoặc bộ lọc khác.'));
    results.append(productCards(matches.slice(page*12,page*12+12)));
    const pages = Math.ceil(matches.length/12);
    if (pages > 1) {
      const pager = element('nav');
      pager.setAttribute('aria-label','Trang danh mục');
      for (let i=0;i<pages;i++) {
        const b = element('button',String(i+1));
        b.disabled = page === i;
        b.onclick = () => {page=i;refresh();};
        pager.append(b);
      }
      results.append(pager);
    }
  }
  filters.oninput = () => {page=0;refresh();};
  panel.replaceChildren(element('h1','Phòng trưng bày gốm'),filters,results);
  refresh();
}
