export const DEFAULT_SUB_CATEGORIES: Record<string, string[]> = {
  火鍋料: ['丸類', '肉片', '海鮮', '豆製品', '蔬菜', '其他'],
  水餃: ['豬肉', '牛肉', '海鮮', '素食', '其他'],
  滷味: ['滷味主菜', '滷味配餐', '滷味套餐', '其他'],
};

export function extractRegion(address: string): string {
  if (!address) return '其他';
  const north = ['台北', '新北', '基隆', '桃園', '新竹', '宜蘭'];
  const central = ['台中', '臺中', '彰化', '南投', '苗栗'];
  const south = ['台南', '臺南', '高雄', '嘉義', '雲林', '屏東'];
  const east = ['花蓮', '台東', '臺東'];
  const island = ['澎湖', '金門', '連江', '馬祖'];
  if (north.some((k) => address.includes(k))) return '北部';
  if (central.some((k) => address.includes(k))) return '中部';
  if (south.some((k) => address.includes(k))) return '南部';
  if (east.some((k) => address.includes(k))) return '東部';
  if (island.some((k) => address.includes(k))) return '離島';
  return '其他';
}
