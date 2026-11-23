import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcrypt';
import prisma from '../src/infrastructure/database/prisma.client.js';
import { getSeedAssetOrPlaceholder } from '../src/infrastructure/storage/image.service.js';
import { thumbOf } from '../src/common/utils/image.util.js';
import { ROLES, USER_STATUS } from '../src/common/constants/roles.js';
import { QUOTE_STATUS, BID_STATUS } from '../src/common/constants/quote-status.js';

/**
 * Tái sử dụng ảnh đã có trên đĩa nếu bản ghi cũ đã có ảnh hợp lệ.
 * Nếu chưa có, nạp ảnh từ prisma/seed-assets/ (nếu có) hoặc tự động sinh ảnh WebP dự phòng.
 */
async function resolveSeedImage({ existingUrl, assetPath, fallbackTitle, categoryName, bgColor }) {
  if (existingUrl) {
    const fullDiskPath = path.resolve('.' + existingUrl);
    if (fs.existsSync(fullDiskPath)) {
      return {
        url: existingUrl,
        thumbnailUrl: thumbOf(existingUrl),
      };
    }
  }

  return getSeedAssetOrPlaceholder({
    assetPath,
    fallbackTitle,
    categoryName,
    bgColor,
  });
}

async function main() {
  console.log('🌱 Bắt đầu nạp dữ liệu mẫu (Seed Data) cho vCraft...');

  const passwordHash = await bcrypt.hash('12345678', 10);

  // =========================================================================
  // 1. Phân loại sản phẩm (Category - 6 danh mục)
  // =========================================================================
  console.log('📦 1. Tạo 6 danh mục sản phẩm...');
  const categoriesData = [
    {
      name: 'Bình – lọ',
      slug: 'binh-lo',
      description: 'Bình hoa, lọ lộc bình gốm sứ phong thuỷ và trang trí',
    },
    {
      name: 'Ấm chén trà',
      slug: 'am-chen-tra',
      description: 'Bộ ấm chén tử sa, men ngọc, men lam thưởng trà truyền thống',
    },
    {
      name: 'Bát đĩa',
      slug: 'bat-dia',
      description: 'Bộ đồ ăn gia đình, nhà hàng chuẩn men sứ nung nhiệt độ cao',
    },
    {
      name: 'Đồ trang trí',
      slug: 'do-trang-tri',
      description: 'Tượng, phù điêu, đèn gốm và vật phẩm mỹ nghệ decor không gian',
    },
    {
      name: 'Quà tặng',
      slug: 'qua-tang',
      description: 'Sản phẩm gốm in logo quà tặng doanh nghiệp, kỷ niệm, sự kiện',
    },
    {
      name: 'Đồ thờ',
      slug: 'do-tho',
      description: 'Bát hương, mâm bồng, đỉnh hạc men rạn cổ phục vụ không gian tâm linh',
    },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
    categories.push(record);
  }

  // =========================================================================
  // 2. Tài khoản Admin & Buyer
  // =========================================================================
  console.log('👤 2. Tạo tài khoản Admin và Buyer...');

  // Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vcraft.vn' },
    update: {},
    create: {
      email: 'admin@vcraft.vn',
      fullName: 'Ban Quản Lý Làng Nghề',
      passwordHash,
      phone: '0901234567',
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
    },
  });

  // Buyer 1
  const buyer1 = await prisma.user.upsert({
    where: { email: 'buyer@uet.vnu.edu.vn' },
    update: {},
    create: {
      email: 'buyer@uet.vnu.edu.vn',
      fullName: 'Nguyễn Văn Doanh',
      passwordHash,
      phone: '0988001122',
      role: ROLES.BUYER,
      status: USER_STATUS.ACTIVE,
    },
  });

  // Buyer 2 (để test phân quyền không xem được đơn của nhau)
  const buyer2 = await prisma.user.upsert({
    where: { email: 'buyer2@uet.vnu.edu.vn' },
    update: {},
    create: {
      email: 'buyer2@uet.vnu.edu.vn',
      fullName: 'Trần Thị Lan',
      passwordHash,
      phone: '0977334455',
      role: ROLES.BUYER,
      status: USER_STATUS.ACTIVE,
    },
  });

  // =========================================================================
  // 3. Tài khoản Nghệ nhân & Hồ sơ xưởng (8 ACTIVE + 1 PENDING)
  // =========================================================================
  console.log('🏺 3. Tạo tài khoản nghệ nhân và hồ sơ xưởng...');

  const artisanSeedDefs = [
    {
      email: 'gom.minhlong@vcraft.vn',
      fullName: 'Trần Minh Long',
      phone: '0912000001',
      shopName: 'Gốm Sứ Minh Long',
      slug: 'gom-minh-long',
      craftSpecialty: 'Gốm men lam vẽ tay',
      familyHistory: 'Trải qua 4 đời gắn bó với nghề chuốt gốm men lam truyền thống Bát Tràng.',
      address: 'Xóm 3, Làng gốm Bát Tràng, Gia Lâm, Hà Nội',
      latitude: 20.9738,
      longitude: 105.9115,
      isOpenForVisit: true,
      openingHours: '08:00 - 17:30',
      status: USER_STATUS.ACTIVE,
      verified: true,
      color: '#B4532A',
    },
    {
      email: 'gom.huonggiang@vcraft.vn',
      fullName: 'Nguyễn Hương Giang',
      phone: '0912000002',
      shopName: 'Gốm Hương Giang',
      slug: 'gom-huong-giang',
      craftSpecialty: 'Gốm men ngọc & men rạn',
      familyHistory: 'Gia đình gìn giữ kỹ thuật men rạn cổ phục chế từ thế kỷ 18.',
      address: 'Xóm 2, Làng gốm Bát Tràng, Gia Lâm, Hà Nội',
      latitude: 20.9752,
      longitude: 105.913,
      isOpenForVisit: true,
      openingHours: '08:00 - 18:00',
      status: USER_STATUS.ACTIVE,
      verified: true,
      color: '#2F6B5C',
    },
    {
      email: 'gom.xuong3@vcraft.vn',
      fullName: 'Lê Đình Đô',
      phone: '0912000003',
      shopName: 'Xưởng Gốm Đình Đô',
      slug: 'xuong-gom-dinh-do',
      craftSpecialty: 'Gốm đất nung truyền thống',
      familyHistory: 'Chuyên các dòng lu hũ, chum đất nung không tráng men chịu nhiệt tốt.',
      address: 'Xóm 1, Làng gốm Bát Tràng, Gia Lâm, Hà Nội',
      latitude: 20.9721,
      longitude: 105.9095,
      isOpenForVisit: true,
      openingHours: '08:30 - 17:00',
      status: USER_STATUS.ACTIVE,
      verified: true,
      color: '#C9A227',
    },
    {
      email: 'gom.xuong4@vcraft.vn',
      fullName: 'Phạm Thị Mai',
      phone: '0912000004',
      shopName: 'Gốm Mỹ Nghệ Mai Trang',
      slug: 'gom-my-nghe-mai-trang',
      craftSpecialty: 'Ấm chén tử sa & gốm mộc',
      address: 'Xóm 4, Làng gốm Bát Tràng',
      latitude: 20.9765,
      longitude: 105.9142,
      isOpenForVisit: false,
      openingHours: '09:00 - 17:00',
      status: USER_STATUS.ACTIVE,
      verified: true,
      color: '#5A4A3C',
    },
    {
      email: 'gom.xuong5@vcraft.vn',
      fullName: 'Hoàng Văn Hưng',
      phone: '0912000005',
      shopName: 'Gốm Cổ Hoàng Hưng',
      slug: 'gom-co-hoang-hung',
      craftSpecialty: 'Bình lọ men hoàng lưu',
      address: 'Xóm 5, Làng gốm Bát Tràng',
      latitude: 20.9715,
      longitude: 105.9125,
      isOpenForVisit: false,
      openingHours: '08:00 - 17:00',
      status: USER_STATUS.ACTIVE,
      verified: true,
      color: '#B4532A',
    },
    {
      email: 'gom.xuong6@vcraft.vn',
      fullName: 'Đỗ Quốc Bảo',
      phone: '0912000006',
      shopName: 'Xưởng Gốm Bảo Long',
      slug: 'xuong-gom-bao-long',
      craftSpecialty: 'Gốm sứ trang trí hiện đại',
      address: 'Khu công nghiệp vừa & nhỏ Bát Tràng',
      latitude: 20.9745,
      longitude: 105.916,
      isOpenForVisit: false,
      openingHours: '08:00 - 17:00',
      status: USER_STATUS.ACTIVE,
      verified: true,
      color: '#2F6B5C',
    },
    {
      email: 'gom.xuong7@vcraft.vn',
      fullName: 'Vũ Bích Hợp',
      phone: '0912000007',
      shopName: 'Gốm Gia Tộc Bích Hợp',
      slug: 'gom-gia-toc-bich-hop',
      craftSpecialty: 'Bộ đồ ăn & gốm gia dụng cao cấp',
      address: 'Xóm 2, Làng gốm Bát Tràng',
      latitude: 20.9772,
      longitude: 105.9102,
      isOpenForVisit: false,
      openingHours: '08:00 - 17:30',
      status: USER_STATUS.ACTIVE,
      verified: true,
      color: '#C9A227',
    },
    {
      email: 'gom.xuong8@vcraft.vn',
      fullName: 'Đặng Minh Tuấn',
      phone: '0912000008',
      shopName: 'Gốm Điêu Khắc Tuấn Đặng',
      slug: 'gom-dieu-khac-tuan-dang',
      craftSpecialty: 'Tượng gốm & phù điêu phong thuỷ',
      address: 'Xóm 3, Làng gốm Bát Tràng',
      latitude: 20.973,
      longitude: 105.9155,
      isOpenForVisit: false,
      openingHours: '08:00 - 17:00',
      status: USER_STATUS.ACTIVE,
      verified: true,
      color: '#5A4A3C',
    },
    {
      email: 'gom.moi@vcraft.vn',
      fullName: 'Bùi Thanh Phong',
      phone: '0912000009',
      shopName: 'Gốm Khởi Nghiệp Thanh Phong',
      slug: 'gom-khoi-nghiep-thanh-phong',
      craftSpecialty: 'Gốm sứ tráng men mộc thủ công',
      familyHistory: 'Hộ làm gốm trẻ đăng ký tham gia mạng lưới triển lãm số vCraft.',
      address: 'Xóm 1, Làng gốm Bát Tràng',
      latitude: 20.971,
      longitude: 105.908,
      isOpenForVisit: false,
      status: USER_STATUS.PENDING, // Chờ Admin duyệt
      verified: false,
      color: '#B4532A',
    },
  ];

  const activeArtisans = [];
  for (const def of artisanSeedDefs) {
    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: {
        fullName: def.fullName,
        phone: def.phone,
        status: def.status,
      },
      create: {
        email: def.email,
        fullName: def.fullName,
        phone: def.phone,
        passwordHash,
        role: ROLES.ARTISAN,
        status: def.status,
      },
    });

    const existingProfile = await prisma.artisanProfile.findUnique({
      where: { userId: user.id },
      select: { coverImage: true, galleryImages: true },
    });

    const coverImg = await resolveSeedImage({
      existingUrl: existingProfile?.coverImage,
      assetPath: `artisans/${def.slug}-cover`,
      fallbackTitle: def.shopName,
      categoryName: 'Xưởng Gốm',
      bgColor: def.color,
    });

    const existingGalleryUrl =
      Array.isArray(existingProfile?.galleryImages) && existingProfile.galleryImages.length > 0
        ? existingProfile.galleryImages[0]?.url
        : null;

    const galleryImg1 = await resolveSeedImage({
      existingUrl: existingGalleryUrl,
      assetPath: `artisans/${def.slug}-gallery-1`,
      fallbackTitle: `${def.shopName} - Góc trưng bày`,
      categoryName: 'Showroom',
      bgColor: '#5A4A3C',
    });

    const profile = await prisma.artisanProfile.upsert({
      where: { userId: user.id },
      update: {
        shopName: def.shopName,
        craftSpecialty: def.craftSpecialty,
        familyHistory: def.familyHistory,
        address: def.address,
        latitude: def.latitude,
        longitude: def.longitude,
        isOpenForVisit: def.isOpenForVisit,
        openingHours: def.openingHours,
        verifiedAt: def.verified ? new Date() : null,
      },
      create: {
        userId: user.id,
        shopName: def.shopName,
        slug: def.slug,
        craftSpecialty: def.craftSpecialty,
        familyHistory: def.familyHistory,
        address: def.address,
        latitude: def.latitude,
        longitude: def.longitude,
        isOpenForVisit: def.isOpenForVisit,
        openingHours: def.openingHours,
        coverImage: coverImg.url,
        galleryImages: [galleryImg1],
        certificates: def.verified
          ? [
              {
                title: 'Nghệ nhân làng nghề tiêu biểu',
                issuer: 'Hiệp hội Làng nghề Việt Nam',
                imageUrl: coverImg.url,
              },
            ]
          : [],
        verifiedAt: def.verified ? new Date() : null,
      },
    });

    if (def.status === USER_STATUS.ACTIVE) {
      activeArtisans.push({ user, profile });
    }
  }

  // =========================================================================
  // 4. Lô sản xuất & Nhật ký (10 lô: 3 lô 5 mốc đầy đủ, 7 lô ngắn)
  // =========================================================================
  console.log('🏭 4. Tạo 10 lô sản xuất và nhật ký truy xuất nguồn gốc...');

  const batchDefs = [
    {
      artisanId: activeArtisans[0].profile.id, // gom.minhlong
      batchCode: 'VCRAFT-K7Q2M9XB',
      title: 'Lô ấm chén men ngọc tháng 11/2026',
      story: 'Đất sét trắng khai thác đầu thu, nung lò ga 1280 độ C trong 18 giờ liên tục.',
      startDate: new Date('2026-11-01'),
      completedDate: new Date('2026-11-20'),
      fullLogs: [
        {
          step: 1,
          name: 'Nhào đất & lọc tạp chất',
          desc: 'Lọc đất qua 3 bể lắng để đạt độ mịn tối đa',
        },
        {
          step: 2,
          name: 'Vuốt tạo dáng trên bàn xoay',
          desc: 'Tạo hình thân ấm và vòi rót thủ công',
        },
        {
          step: 3,
          name: 'Chạm khắc hoa văn chìm',
          desc: 'Nghệ nhân tỉa hoa sen chìm dưới thân ấm',
        },
        {
          step: 4,
          name: 'Tráng men ngọc bảo thủ',
          desc: 'Nhúng men ngọc theo công thức gia truyền',
        },
        {
          step: 5,
          name: 'Nung lò 1280 độ C & Hoàn thiện',
          desc: 'Nung liên tục 18 giờ, kiểm tra độ ngân của gốm',
        },
      ],
    },
    {
      artisanId: activeArtisans[1].profile.id, // gom.huonggiang
      batchCode: 'VCRAFT-R3P8T1WY',
      title: 'Lô bình hút tài lộc men rạn cổ',
      story:
        'Sử dụng đất sét phù sa sông Hồng pha tro trấu, tạo vân rạn tự nhiên theo lối cổ truyền.',
      startDate: new Date('2026-10-15'),
      completedDate: new Date('2026-11-05'),
      fullLogs: [
        {
          step: 1,
          name: 'Chọn phù sa & luyện đất',
          desc: 'Đất phù sa phơi sương 30 ngày trước khi nghiền',
        },
        { step: 2, name: 'Đổ rót & tạo phôi bình', desc: 'Định hình bình tài lộc cổ thắt eo' },
        {
          step: 3,
          name: 'Vẽ hoạ tiết men lam tứ quý',
          desc: 'Hoạ sĩ vẽ tùng cúc trúc mai bằng bút lông tơ',
        },
        { step: 4, name: 'Xử lý nước men rạn', desc: 'Ủ men trong chum sành 7 ngày' },
        { step: 5, name: 'Nung khử & đánh thuốc tím', desc: 'Tạo đường vân rạn đen rõ nét' },
      ],
    },
    {
      artisanId: activeArtisans[2].profile.id, // gom.xuong3
      batchCode: 'VCRAFT-N4M6V8XZ',
      title: 'Lô bát đĩa hoa cúc men lam gia đình',
      story: 'Bộ bàn ăn gia dụng nung nhiệt độ cao khử sạch chì, an toàn tuyệt đối khi sử dụng.',
      startDate: new Date('2026-11-05'),
      completedDate: null,
      fullLogs: [
        {
          step: 1,
          name: 'Ép khuôn bán tự động',
          desc: 'Tạo phôi đĩa và bát ăn cơm đồng đều kích thước',
        },
        { step: 2, name: 'Sửa bavia & chuốt láng', desc: 'Lau nhẵn mép bát chống nứt miệng' },
        { step: 3, name: 'Vẽ hoa cúc dây men chìm', desc: 'Họa sĩ vẽ tay từng chiếc đĩa' },
        { step: 4, name: 'Phun men bóng nano', desc: 'Phun men chống bám dính dầu mỡ' },
        { step: 5, name: 'Nung lò con thoi hiện đại', desc: 'Gia nhiệt theo biểu đồ 1260 độ C' },
      ],
    },
    // 7 lô còn lại có 1-2 mốc
    {
      artisanId: activeArtisans[3].profile.id,
      batchCode: 'VCRAFT-A2B3C4D5',
      title: 'Lô ấm tử sa dáng thạch biểu',
      startDate: new Date('2026-11-10'),
      fullLogs: [{ step: 1, name: 'Luyện đất tử sa thô', desc: 'Ủ đất trong hầm kín' }],
    },
    {
      artisanId: activeArtisans[4].profile.id,
      batchCode: 'VCRAFT-E6F7G8H9',
      title: 'Lô lọ lục bình men hoàng lưu',
      startDate: new Date('2026-11-12'),
      fullLogs: [{ step: 1, name: 'Chuốt phôi bình cao 1m6', desc: 'Ghép 3 đoạn thân bình' }],
    },
    {
      artisanId: activeArtisans[5].profile.id,
      batchCode: 'VCRAFT-J2K3L4M5',
      title: 'Lô đèn gốm thấu quang trang trí',
      startDate: new Date('2026-11-08'),
      fullLogs: [
        { step: 1, name: 'Đục lỗ thấu quang', desc: 'Khoét thủ công hàng ngàn lỗ tia sáng' },
      ],
    },
    {
      artisanId: activeArtisans[6].profile.id,
      batchCode: 'VCRAFT-P6Q7R8S9',
      title: 'Lô thố sứ hấp tổ yến cao cấp',
      startDate: new Date('2026-11-14'),
      fullLogs: [{ step: 1, name: 'Nung sơ phôi trắng', desc: 'Nung lần 1 nhiệt độ 800 độ C' }],
    },
    {
      artisanId: activeArtisans[7].profile.id,
      batchCode: 'VCRAFT-T2U3V4W5',
      title: 'Lô tượng thiền sư gốm mộc',
      startDate: new Date('2026-11-02'),
      fullLogs: [
        { step: 1, name: 'Đắp tay chi tiết diện tượng', desc: 'Nghệ nhân điêu khắc biểu cảm' },
      ],
    },
    {
      artisanId: activeArtisans[0].profile.id,
      batchCode: 'VCRAFT-X6Y7Z8A1',
      title: 'Lô cốc sứ quà tặng in logo UET',
      startDate: new Date('2026-11-15'),
      fullLogs: [{ step: 1, name: 'Dán decal vàng kim', desc: 'In chuyển nhiệt logo trường' }],
    },
    {
      artisanId: activeArtisans[1].profile.id,
      batchCode: 'VCRAFT-B2C3D4E5',
      title: 'Lô chén trà chén khải men ngọc',
      startDate: new Date('2026-11-16'),
      fullLogs: [{ step: 1, name: 'Tiện nắp chén khải khít khao', desc: 'Kiểm tra độ kín khít' }],
    },
  ];

  const batches = [];
  for (const b of batchDefs) {
    const batchRecord = await prisma.productionBatch.upsert({
      where: { batchCode: b.batchCode },
      update: {
        title: b.title,
        story: b.story || null,
        startDate: b.startDate,
        completedDate: b.completedDate || null,
      },
      create: {
        artisanId: b.artisanId,
        batchCode: b.batchCode,
        title: b.title,
        story: b.story || null,
        startDate: b.startDate,
        completedDate: b.completedDate || null,
      },
    });

    for (const log of b.fullLogs) {
      const existingLog = await prisma.productionLog.findUnique({
        where: {
          batchId_stepOrder: {
            batchId: batchRecord.id,
            stepOrder: log.step,
          },
        },
        select: { imageUrl: true },
      });

      const logImg = await resolveSeedImage({
        existingUrl: existingLog?.imageUrl,
        assetPath: `batches/${b.batchCode}-step-${log.step}`,
        fallbackTitle: log.name,
        categoryName: `Bước ${log.step}`,
        bgColor: '#2F6B5C',
      });

      await prisma.productionLog.upsert({
        where: {
          batchId_stepOrder: {
            batchId: batchRecord.id,
            stepOrder: log.step,
          },
        },
        update: {
          stageName: log.name,
          description: log.desc,
          imageUrl: logImg.url,
          thumbnailUrl: logImg.thumbnailUrl,
        },
        create: {
          batchId: batchRecord.id,
          stepOrder: log.step,
          stageName: log.name,
          description: log.desc,
          imageUrl: logImg.url,
          thumbnailUrl: logImg.thumbnailUrl,
        },
      });
    }

    batches.push(batchRecord);
  }

  // =========================================================================
  // 5. Sản phẩm (48 sản phẩm: 6 sp/hộ x 8 hộ ACTIVE; 12 độc bản, 4 đã ẩn)
  // =========================================================================
  console.log('🛍️ 5. Tạo 48 sản phẩm mẫu, gán lô và phân loại...');

  const productTemplates = [
    { name: 'Bình hút lộc men lam vẽ rồng', price: 1850000, cat: 'Bình – lọ', isUnique: true },
    { name: 'Bộ ấm chén tử sa chuông đồng', price: 920000, cat: 'Ấm chén trà', isUnique: false },
    { name: 'Bộ bát đĩa men ngọc hoàng gia', price: 1450000, cat: 'Bát đĩa', isUnique: false },
    { name: 'Tượng Di Lặc gốm men rạn', price: 2600000, cat: 'Đồ trang trí', isUnique: true },
    { name: 'Cốc sứ lưu niệm hoa văn cổ', price: 120000, cat: 'Quà tặng', isUnique: false },
    { name: 'Đỉnh hạc tam sự men lam cổ', price: 4500000, cat: 'Đồ thờ', isUnique: true },
  ];

  let productCount = 0;
  for (let i = 0; i < activeArtisans.length; i++) {
    const artisan = activeArtisans[i];

    for (let j = 0; j < productTemplates.length; j++) {
      productCount++;
      const tpl = productTemplates[j];
      const prodName = `${tpl.name} - ${artisan.profile.shopName}`;
      const slug = `sp-${artisan.profile.slug}-${j + 1}`;

      const catRecord = categories.find((c) => c.name === tpl.cat) || categories[0];

      // Gắn 2-3 sản phẩm vào 3 lô đầy đủ đầu tiên
      let linkedBatchId = null;
      if (i === 0 && j < 3) linkedBatchId = batches[0].id;
      if (i === 1 && j < 3) linkedBatchId = batches[1].id;
      if (i === 2 && j < 3) linkedBatchId = batches[2].id;

      // 4 sản phẩm ẩn để test chức năng ẩn / hiện sản phẩm
      const isActive = productCount > 4;

      // 12 sản phẩm độc bản
      const isUnique = tpl.isUnique || productCount % 4 === 0;

      const existingProd = await prisma.product.findUnique({
        where: { slug },
        select: { images: true },
      });
      const existingProdUrl =
        Array.isArray(existingProd?.images) && existingProd.images.length > 0
          ? existingProd.images[0]?.url
          : null;

      const pImg = await resolveSeedImage({
        existingUrl: existingProdUrl,
        assetPath: `products/${slug}`,
        fallbackTitle: prodName,
        categoryName: catRecord.name,
        bgColor: j % 2 === 0 ? '#B4532A' : '#2F6B5C',
      });

      await prisma.product.upsert({
        where: { slug },
        update: {
          name: prodName,
          price: tpl.price,
          description: `Sản phẩm thủ công cao cấp được chế tác tại ${artisan.profile.shopName}. Sử dụng chất liệu đất tinh luyện, nung trên 1200 độ C, đảm bảo độ bóng đẹp và bền màu theo thời gian.`,
          images: [pImg],
          isUnique,
          isActive,
          batchId: linkedBatchId,
          categoryId: catRecord.id,
        },
        create: {
          artisanId: artisan.profile.id,
          categoryId: catRecord.id,
          batchId: linkedBatchId,
          name: prodName,
          slug,
          price: tpl.price,
          description: `Sản phẩm thủ công cao cấp được chế tác tại ${artisan.profile.shopName}. Sử dụng chất liệu đất tinh luyện, nung trên 1200 độ C, đảm bảo độ bóng đẹp và bền màu theo thời gian.`,
          images: [pImg],
          isUnique,
          isActive,
        },
      });
    }
  }

  // =========================================================================
  // 6. Tin tức cộng đồng (6 tin tức đủ 4 danh mục)
  // =========================================================================
  console.log('📰 6. Tạo 6 tin tức cộng đồng...');

  const newsItems = [
    {
      title: 'Cập nhật biến động giá đất sét trắng và cao lanh Quý 4/2026',
      slug: 'gia-dat-set-trang-quy-4-2026',
      category: 'MATERIAL_PRICE',
      content:
        'Ban Quản lý thông báo bảng giá vật liệu đầu vào dành cho các hộ hội viên. Giá đất sét trắng tinh lọc hiện dao động từ 1.800.000đ/tấn, cao lanh nguyên chất 2.200.000đ/tấn. Đề nghị các hộ lập kế hoạch nhập liệu sớm chuẩn bị cho đơn hàng Tết.',
    },
    {
      title: 'Bảng giá men tự nhiên và oxit kim loại tháng 11',
      slug: 'bang-gia-men-tu-nhien-thang-11',
      category: 'MATERIAL_PRICE',
      content:
        'Nhà cung ứng vật liệu làng nghề cập nhật giá men ngọc, men lam và phụ gia chống nứt. Chi tiết liên hệ văn phòng HTX để nhận báo giá chiết khấu tập thể.',
    },
    {
      title: 'Thông báo lịch cúp điện định kỳ phục vụ bảo trì trạm biến áp',
      slug: 'lich-cup-dien-bao-tri-tram-bien-ap',
      category: 'POWER_OUTAGE',
      content:
        'Điện lực Gia Lâm thông báo lịch ngừng cung cấp điện khu vực Xóm 2 và Xóm 3 từ 07:00 đến 12:00 ngày 30/11/2026. Các hộ vận hành lò nung điện chú ý lịch trình để điều chỉnh mẻ nung an toàn.',
    },
    {
      title: 'Chính sách hỗ trợ vay vốn ưu đãi 5% chuyển đổi lò nung sạch',
      slug: 'chinh-sach-vay-von-lo-nung-sach',
      category: 'SUPPORT_POLICY',
      content:
        'UBND Thành phố phối hợp Ngân hàng Chính sách triển khai gói tín dụng xanh 50 tỷ đồng hỗ trợ các hộ gia đình chuyển đổi sang lò gas và lò điện thân thiện với môi trường, hạn chế khí thải.',
    },
    {
      title: 'Hỗ trợ 100% kinh phí gian hàng Triển lãm Làng nghề Quốc tế 2027',
      slug: 'ho-tro-kinh-phi-gian-hang-2027',
      category: 'SUPPORT_POLICY',
      content:
        'Chương trình xúc tiến thương mại tài trợ gian hàng cho 10 hộ có sản phẩm đạt chứng nhận OCOP 4 sao tham gia hội chợ triển lãm tại Trung tâm Triển lãm Giảng Võ.',
    },
    {
      title: 'Phát động Hội thi thợ giỏi Bàn tay vàng gốm sứ 2026',
      slug: 'hoi-thi-tho-gioi-ban-tay-vang-2026',
      category: 'GENERAL',
      content:
        'Chào mừng ngày truyền thống làng nghề, Ban tổ chức phát động cuộc thi tay nghề vuốt gốm và vẽ men cho các thợ trẻ dưới 35 tuổi. Giải thưởng lớn gồm cúp Bàn tay vàng và tiền mặt 30 triệu đồng.',
    },
  ];

  for (const n of newsItems) {
    const existingNews = await prisma.news.findUnique({
      where: { slug: n.slug },
      select: { imageUrl: true },
    });

    const newsImg = await resolveSeedImage({
      existingUrl: existingNews?.imageUrl,
      assetPath: `news/${n.slug}`,
      fallbackTitle: n.title,
      categoryName: 'Bản Tin',
      bgColor: '#2B2118',
    });

    await prisma.news.upsert({
      where: { slug: n.slug },
      update: {
        title: n.title,
        content: n.content,
        category: n.category,
      },
      create: {
        authorId: adminUser.id,
        title: n.title,
        slug: n.slug,
        category: n.category,
        content: n.content,
        imageUrl: newsImg.url,
      },
    });
  }

  // =========================================================================
  // 7. Yêu cầu báo giá & Chào giá (Khớp State Machine theo docs/05)
  // =========================================================================
  console.log('📋 7. Tạo 4 yêu cầu báo giá và chào giá mẫu...');

  // Xoá hoặc bỏ qua nếu đã có đơn báo giá để đảm bảo tính Idempotent
  const existingQuotesCount = await prisma.quoteRequest.count();
  if (existingQuotesCount === 0) {
    const cupCategory = categories.find((c) => c.slug === 'am-chen-tra') || categories[0];

    // Đơn 1: Nháp (DRAFT, version: 0)
    await prisma.quoteRequest.create({
      data: {
        buyerId: buyer1.id,
        categoryId: cupCategory.id,
        title: 'Đặt 1.000 cốc sứ in logo khoa CNTT',
        description:
          'Cốc sứ trắng dung tích 350ml, quai vuông, có in logo Trường ĐH Công nghệ trên thân.',
        totalQuantity: 1000,
        targetBudget: 50000000,
        deliveryDeadline: new Date('2027-02-15'),
        status: QUOTE_STATUS.DRAFT,
        version: 0,
      },
    });

    // Đơn 2: Đang chào giá (ARTISANS_BIDDING, version: 3, 2 bid SUBMITTED, mời cả 8 hộ ACTIVE)
    const quoteBidding = await prisma.quoteRequest.create({
      data: {
        buyerId: buyer1.id,
        categoryId: cupCategory.id,
        title: 'Đặt 5.000 cốc in logo Trường ĐH Công nghệ kỷ niệm 25 năm',
        description:
          'Cốc sứ trắng 300ml, men bóng cao cấp, in logo kỷ niệm hai mặt, kèm hộp giấy kraft từng chiếc.',
        totalQuantity: 5000,
        targetBudget: 250000000,
        deliveryDeadline: new Date('2027-01-20'),
        status: QUOTE_STATUS.ARTISANS_BIDDING,
        version: 3, // 1 lần gửi + 2 lần bid
      },
    });

    // Mời cả 8 hộ ACTIVE
    for (const art of activeArtisans) {
      await prisma.quoteInvitation.create({
        data: {
          quoteRequestId: quoteBidding.id,
          artisanId: art.profile.id,
        },
      });
    }

    // Bid 1: Gốm Minh Long (offered: 3000, 42.000đ)
    await prisma.quoteBid.create({
      data: {
        quoteRequestId: quoteBidding.id,
        artisanId: activeArtisans[0].profile.id,
        unitPrice: 42000,
        offeredQuantity: 3000,
        estimatedCompletionDate: new Date('2026-12-25'),
        note: 'Đã bao gồm hộp giấy và in logo hai mặt bền màu vĩnh viễn',
        status: BID_STATUS.SUBMITTED,
      },
    });

    // Bid 2: Gốm Hương Giang (offered: 2500, 44.000đ)
    await prisma.quoteBid.create({
      data: {
        quoteRequestId: quoteBidding.id,
        artisanId: activeArtisans[1].profile.id,
        unitPrice: 44000,
        offeredQuantity: 2500,
        estimatedCompletionDate: new Date('2026-12-30'),
        note: 'Men bóng dày, kiểm định an toàn thực phẩm đầy đủ',
        status: BID_STATUS.SUBMITTED,
      },
    });

    // Đơn 3: Đang sản xuất (IN_PRODUCTION, version: 5, chia 2 hộ: 3000 + 2000 = 5000)
    const quoteInProd = await prisma.quoteRequest.create({
      data: {
        buyerId: buyer2.id,
        categoryId: cupCategory.id,
        title: 'Đặt 5.000 bộ ấm chén men lam quà tặng hội nghị',
        description:
          'Bộ ấm chén 1 ấm 6 chén đĩa lót, men lam cổ trang nhã, đóng gói thùng xốp chuyên dụng.',
        totalQuantity: 5000,
        targetBudget: 400000000,
        deliveryDeadline: new Date('2027-03-01'),
        status: QUOTE_STATUS.IN_PRODUCTION,
        version: 5,
      },
    });

    // Mời 2 hộ
    await prisma.quoteInvitation.createMany({
      data: [
        { quoteRequestId: quoteInProd.id, artisanId: activeArtisans[0].profile.id },
        { quoteRequestId: quoteInProd.id, artisanId: activeArtisans[1].profile.id },
      ],
    });

    // 1 bid đang sản xuất, 1 bid đã chốt chờ làm
    await prisma.quoteBid.create({
      data: {
        quoteRequestId: quoteInProd.id,
        artisanId: activeArtisans[0].profile.id,
        unitPrice: 78000,
        offeredQuantity: 3500,
        acceptedQuantity: 3000,
        estimatedCompletionDate: new Date('2027-02-15'),
        note: 'Nhận 3.000 bộ, đã bắt đầu khâu tạo phôi đất',
        status: BID_STATUS.IN_PRODUCTION,
      },
    });

    await prisma.quoteBid.create({
      data: {
        quoteRequestId: quoteInProd.id,
        artisanId: activeArtisans[1].profile.id,
        unitPrice: 80000,
        offeredQuantity: 2500,
        acceptedQuantity: 2000,
        estimatedCompletionDate: new Date('2027-02-20'),
        note: 'Nhận 2.000 bộ còn lại theo thoả thuận',
        status: BID_STATUS.ACCEPTED,
      },
    });

    // Đơn 4: Đã huỷ (CANCELLED, version: 3)
    const quoteCancelled = await prisma.quoteRequest.create({
      data: {
        buyerId: buyer2.id,
        categoryId: cupCategory.id,
        title: 'Đặt 500 lọ hoa gốm men rạn (Đã huỷ)',
        description: 'Đơn hàng huỷ do thay đổi kế hoạch tổ chức sự kiện.',
        totalQuantity: 500,
        targetBudget: 50000000,
        deliveryDeadline: new Date('2026-12-01'),
        status: QUOTE_STATUS.CANCELLED,
        version: 3,
      },
    });

    await prisma.quoteInvitation.create({
      data: {
        quoteRequestId: quoteCancelled.id,
        artisanId: activeArtisans[0].profile.id,
      },
    });

    await prisma.quoteBid.create({
      data: {
        quoteRequestId: quoteCancelled.id,
        artisanId: activeArtisans[0].profile.id,
        unitPrice: 95000,
        offeredQuantity: 500,
        estimatedCompletionDate: new Date('2026-11-28'),
        status: BID_STATUS.CANCELLED,
      },
    });
  }

  console.log('🎉 Nạp dữ liệu mẫu thành công 100%!');
  console.log('---------------------------------------------------------');
  console.log('📌 Tài khoản Admin: admin@vcraft.vn / 12345678');
  console.log('📌 Tài khoản Buyer 1: buyer@uet.vnu.edu.vn / 12345678');
  console.log('📌 Tài khoản Buyer 2: buyer2@uet.vnu.edu.vn / 12345678');
  console.log('📌 Tài khoản Nghệ nhân 1: gom.minhlong@vcraft.vn / 12345678');
  console.log('📌 Tài khoản Nghệ nhân 2: gom.huonggiang@vcraft.vn / 12345678');
  console.log('📌 Tài khoản Chờ duyệt: gom.moi@vcraft.vn / 12345678');
  console.log('---------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi chạy seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
