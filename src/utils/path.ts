/**
 * 获取assets下的静态资源文件
 * @param {string} path
 * @returns 返回文件路径
 */
export const getAssetsFile = (path: string) => {
  return new URL(path, import.meta.url).href
}
