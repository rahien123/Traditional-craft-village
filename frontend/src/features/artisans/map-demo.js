const panel = document.querySelector('#panel');
const sketch = document.querySelector('#sketch');
const preview = document.querySelector('#preview');
const wrapper = document.querySelector('#mapwrap');
const note = document.querySelector('#note');
const assets = '../../../../backend/prisma/seed-assets/';
const sample = new URLSearchParams(location.search).get('sample') === 'abc';
const mapData = sample ? [
  {...workshops[0], name:'A · ' + workshops[0].name, isOpenForVisit:true},
  {...workshops[3], name:'B · ' + workshops[3].name, isOpenForVisit:false},
  {...workshops[2], name:'C · ' + workshops[2].name, lat:null, lng:null}
] : workshops;
const places = mapData.filter(w => w.lat != null && w.lng != null);
const markers = [];
let map;
let openOnly = false;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text, path) {
  const anchor = element('a', text);
  anchor.href = '#' + path;
  return anchor;
}

function photo(file, title, small = false) {
  const image = element('img');
  image.src = small && thumbnails[file] ? thumbnails[file] : assets + file;
  image.alt = title;
  image.loading = 'lazy';
  return image;
}

function popup(w) {
  const box = element('div');
  if (w.cover) {
    const image = photo(w.cover, w.name, true);
    image.className = 'popup-thumb';
    box.append(image);
  }
  box.append(link(w.name, '/artisans/' + w.slug), element('p', w.specialty),
    element('small', (w.isOpenForVisit ? 'Đang mở cửa' : 'Chưa mở cửa đón khách') + ' · ' + w.openingHours));
  return box;
}

function selectPin(i) {
  const w = places[i];
  if (map) {
    map.setView([w.lat, w.lng], Math.max(16, map.getZoom()));
    markers[i].openPopup();
  } else {
    const close = element('button', 'Đóng');
    close.onclick = () => { preview.hidden = true; };
    preview.replaceChildren(popup(w), close);
    preview.hidden = false;
  }
}

function row(control, title, detail, image) {
  control.className = 'row';
  if (image) control.append(photo(image, title, true));
  const label = element('span');
  label.append(element('strong', title), element('small', detail));
  control.append(label, element('b', '›'));
  return control;
}

function showMap() {
  preview.hidden = true;
  const visible = places.filter(w => !openOnly || w.isOpenForVisit);
  const filter = element('input');
  filter.type = 'checkbox';
  filter.checked = openOnly;
  filter.onchange = () => { openOnly = filter.checked; showMap(); };
  const label = element('label');
  label.append(filter, ' Đang đón khách');
  panel.replaceChildren(element('h2', 'Khám phá ' + visible.length + ' xưởng'), label);
  const switcher = element('a', sample ? 'Trở về bản đồ 8 xưởng' : 'Thử bản đồ với 3 xưởng mẫu');
  switcher.href = sample ? 'map-demo.html#/map' : '?sample=abc#/map';
  panel.append(switcher);
  if (sample) panel.append(element('p', 'A đón khách · B tạm ngừng đón khách · C chưa có tọa độ.'));
  if (map) { map.invalidateSize(); map.closePopup(); }
  places.forEach((w, i) => {
    const show = visible.includes(w);
    sketch.children[i].hidden = !show;
    if (map && show) markers[i].addTo(map);
    if (map && !show) markers[i].remove();
    if (!show) return;
    const button = row(element('button'), w.name, w.specialty, w.cover);
    button.onclick = () => selectPin(i);
    panel.append(button);
  });
  if (map && visible.length) map.fitBounds(visible.map(w => [w.lat,w.lng]), {padding:[36,36]});
}

const dong = new Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND', maximumFractionDigits:0});
function shop(w) {
  const introduction = element('section', '', 'studio-intro');
  const copy = element('div');
  copy.append(element('small', 'Phòng trưng bày của xưởng'), element('h1', w.name),
    element('h2', w.specialty));
  if (w.history) copy.append(element('p', w.history));
  copy.append(element('p', w.visitNote));
  introduction.append(copy, photoBanner(w.cover, w.name));
  panel.replaceChildren(link('← Trở về bản đồ', '/map'), introduction);
  const visit = element('section', '', 'visit-info');
  visit.append(element('h3','Ghé thăm xưởng'), element('p',w.address),
    element('p',(w.isOpenForVisit ? 'Đang đón khách' : 'Tạm ngừng đón khách') + ' · ' + w.openingHours));
  if (w.verified) visit.append(element('small','Xưởng đã xác thực trong dữ liệu mẫu'));
  panel.append(visit, element('h2','Bộ sưu tập của xưởng'), productCards(w.products.map(p => ({w,p}))));
  if (w.gallery) panel.append(element('h2','Một góc xưởng'),galleryPhoto(w.gallery,'Ảnh tư liệu xưởng ' + w.name));
}

function product(w, p) {
  const exhibit = element('section','','object-view');
  const label = element('div');
  label.append(element('small', p.category + (p.isUnique ? ' · Độc bản trong bộ sưu tập mẫu' : '')),element('h1',p.name),
    link(w.name, '/artisans/' + w.slug));
  if (p.description) label.append(element('p',p.description));
  if (p.batch) label.append(element('p','Mã lô mẫu · ' + p.batch),link('Xem nhật ký lô →','/trace/' + p.batch));
  label.append(element('small','Giá tham khảo (dữ liệu mẫu) · ' + dong.format(p.price),'reference-price'));
  exhibit.append(galleryPhoto(p.image,p.name),label);
  panel.replaceChildren(link('← Phòng trưng bày','/products'),exhibit);
}

function trace(code, lot) {
  const owner = allProducts().find(({p}) => p.batch === code);
  const back = history.state?.productPath || (owner && '/products/' + owner.p.slug);
  const list = element('ol', '', 'journal');
  for (const [index, step] of lot.steps.entries()) {
    const item = element('li');
    const heading = element('h3', step.name);
    const number = element('span', String(index + 1), 'step-number');
    heading.prepend(number);
    item.append(heading);
    if (step.image) {
      const fromSource = step.image.startsWith('https://');
      const localFile = fromSource ? 'batches/' + code + '-step-' + (index + 1) + '.jpg' : step.image;
      const image = photo(localFile, step.name);
      const full = element('a', '', 'step-photo');
      full.href = image.src;
      if (fromSource) {
        image.onerror = () => {
          image.onerror = null;
          image.src = step.image;
          full.href = step.image;
        };
      }
      full.target = '_blank';
      full.rel = 'noopener';
      full.append(image);
      item.append(full);
    }
    item.append(element('p', step.desc));
    list.append(item);
  }
  panel.replaceChildren(link(back ? '← Sản phẩm' : '← Bản đồ xưởng', back || '/map'),
    element('h2', lot.title), element('small', code), element('p', lot.story), list);
}

function render() {
  const path = location.hash.slice(1);
  wrapper.hidden = path !== '/map';
  if (path === '/') return homePage();
  if (path === '/products') return catalogPage();
  if (path === '/artisans') return directoryPage();
  if (path === '/map') return showMap();
  for (const w of workshops) {
    if (path === '/artisans/' + w.slug) return shop(w);
    const p = w.products.find(item => path === '/products/' + item.slug);
    if (p) return product(w, p);
  }
  const code = path.slice('/trace/'.length);
  if (path.startsWith('/trace/') && Object.hasOwn(lots, code)) return trace(code, lots[code]);
  panel.replaceChildren(element('h2', 'Không tìm thấy trang'), link('Về bản đồ xưởng', '/map'));
}

function percent(value, values) {
  const min = Math.min(...values);
  return 10 + 80 * (value - min) / (Math.max(...values) - min || 1) + '%';
}
places.forEach((w, i) => {
  const pin = element('button', String(i + 1), 'pin');
  pin.setAttribute('aria-label', w.name);
  pin.style.left = percent(w.lng, places.map(place => place.lng));
  pin.style.bottom = percent(w.lat, places.map(place => place.lat));
  pin.onclick = () => selectPin(i);
  sketch.append(pin);
});

function startMap() {
  document.querySelector('#map').hidden = false;
  preview.hidden = sketch.hidden = true;
  map = L.map('map', {scrollWheelZoom:false});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).on('tileload', () => { note.hidden = true; }).on('tileerror', () => {
    note.hidden = false;
    note.textContent = 'Chưa tải được nền đường phố. Vẫn có thể chọn ghim xưởng.';
  }).addTo(map);
  places.forEach((w, i) => {
    const icon = L.divIcon({className:'pin', html:String(i + 1), iconSize:[44,44], iconAnchor:[22,22]});
    markers.push(L.marker([w.lat,w.lng], {icon, title:w.name, alt:w.name}).bindPopup(popup(w)));
  });
  if (!wrapper.hidden) showMap();
}

if (!location.hash) history.replaceState(null, '', '#/map');
window.addEventListener('hashchange', event => {
  const previous = new URL(event.oldURL).hash.slice(1);
  if (location.hash.startsWith('#/trace/') && previous.startsWith('/products/'))
    history.replaceState({productPath:previous}, '');
  render();
  window.scrollTo(0, 0);
});
render();
const library = element('script');
library.src = '../../assets/leaflet/leaflet.js';
library.onload = startMap;
document.body.append(library);

