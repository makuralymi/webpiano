# 部署前检查清单

在部署到静态托管平台（Cloudflare Pages、GitHub Pages 等）之前，请确保：

## ✅ 必须执行的操作

1. **生成播放列表索引**
   ```bash
   node generate-playlist.js
   ```
   这会创建/更新 `playlist/playlist.json` 文件

2. **提交所有更改**
   ```bash
   git add .
   git commit -m "Update playlist"
   git push
   ```

## 📝 可选操作

- 如果添加了本地音源（`samples_ogg/`），确认文件总大小 < 25MB（Cloudflare Pages 限制）
- 检查 `playlist/` 文件夹中的 MIDI 文件是否都已添加到 Git

## 🚀 部署后验证

访问部署后的网站，检查：
- [ ] 页面正常加载
- [ ] 播放列表显示所有曲目
- [ ] 点击曲目可以正常播放
- [ ] 轨道颜色设置正常
- [ ] 粒子特效正常显示

---

**注意**：如果忘记运行 `generate-playlist.js`，部署后播放列表将为空，但手动拖放 MIDI 文件仍可正常使用。
