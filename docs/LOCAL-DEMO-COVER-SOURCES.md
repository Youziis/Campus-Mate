# 国内来源演示活动封面

以下为用户确认后导入的8条演示活动。图片仅与主题对应，原始页面中的学校、商家及人物不代表本平台活动的发起者或合作方。
公开复用许可尚未确认；保留来源不等于取得授权。需要公开分发或正式使用时，应取得授权或替换为已授权素材。
图片是示意配图，不把历史展览、报道或照片当作当前真实活动。

| 活动 | 本地封面 | 来源网页 | 图片内容说明 |
| --- | --- | --- | --- |
| 周末羽毛球双打：新手也能一起挥拍 | /uploads/local-demo-covers/badminton.jpg | [原始页面](https://www.xujc.com/info/74qlqvjg.html) | 厦门大学嘉庚学院与漳州开发区羽毛球交流活动 |
| 黄厝追日出：一起等海面亮起来 | /uploads/local-demo-covers/sunrise.jpg | [原始页面](https://m.sohu.com/a/982757428_122530457) | 搜狐文章标注的黄厝海滩日出，地点未独立核验 |
| 图书馆专注两小时：带上你的待办清单 | /uploads/local-demo-covers/study.jpg | [原始页面](https://www.xujc.com/info/x4zz7224.html) | 厦门大学嘉庚学院图书馆学习场景 |
| 把周末插进花瓶：零基础花艺搭子 | /uploads/local-demo-covers/flowers.jpg | [原始页面](https://www.fjglhs.com/teach/class) | 厦门国兰花尚花艺培训课堂；配图不表示商家承办本活动 |
| 今晚不当社恐：UNO和狼人杀破冰局 | /uploads/local-demo-covers/boardgames.png | [原始页面](https://yurenhao1.sizhengwang.cn/a/xmdx/240930/1939849.shtml) | 厦门大学景润青年学生社区活动 |
| 厦门沙茶面探店：寻找你最爱的那碗汤 | /uploads/local-demo-covers/noodles.jpg | [原始页面](https://k.sina.cn/article_2918442287_adf3e52f00100lli0.html?from=food) | 新浪用户文章中的沙茶面配图，具体店铺未确认 |
| 鼓浪屿慢游与陶艺初体验 | /uploads/local-demo-covers/pottery.jpg | [原始页面](https://city.cri.cn/20170831/bffb4f7f-b702-94b3-3250-13033ebfe527.html) | 国际在线刊载的鼓浪屿陶艺场景，原文标注新华社摄影来源 |
| 厦门市博物馆同行：慢慢看展再聊聊 | /uploads/local-demo-covers/museum.jpg | [原始页面](https://www.xmmuseum.com/zn/yczn/202210/t20221028_2696.htm) | 厦门市博物馆历史展厅，不代表当前展览安排 |

## 再次执行

运行 `node scripts/seed-local-cover-activities.mjs`。脚本按封面路径判断是否已导入，重复执行不会新增重复活动或改变已有活动信息。
导入后运行 `npm run data:export`，将共享快照与封面一起提交。
