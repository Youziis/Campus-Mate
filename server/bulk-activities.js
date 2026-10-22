// 批量演示活动清单。coverQuery 用于从 Wikimedia Commons 查找可复用封面。
export const bulkActivities = [
  { category: "运动", title: "傍晚操场慢跑搭子", description: "按轻松配速慢跑三到五公里，跑前热身、跑后拉伸，适合刚开始运动的同学。", location: "东区操场看台", capacity: 8, hour: 18, duration: 2, tags: ["跑步", "运动"], coverQuery: "jogging running track students" },
  { category: "运动", title: "乒乓球新手对练", description: "从发球和正反手基础开始练习，水平不限，球拍不足时可以现场轮换。", location: "体育馆乒乓球区", capacity: 6, hour: 19, duration: 2, tags: ["乒乓球", "运动"], coverQuery: "table tennis players indoor" },
  { category: "运动", title: "校园篮球三对三", description: "随机组队进行半场三对三，友谊第一，欢迎想活动筋骨的同学。", location: "西区篮球场", capacity: 9, hour: 16, duration: 2, tags: ["篮球", "运动"], coverQuery: "basketball outdoor court game" },
  { category: "运动", title: "羽毛球双打轮换局", description: "双打轮换练习，强度适中，带球拍即可参加，现场统一准备羽毛球。", location: "体育馆二号馆", capacity: 8, hour: 19, duration: 2, tags: ["羽毛球", "运动"], coverQuery: "badminton doubles match" },

  { category: "户外", title: "海边日出摄影散步", description: "早起去海边等待日出，沿栈道散步拍照，手机和相机都可以。", location: "黄厝海岸公交站", capacity: 8, hour: 5, duration: 3, tags: ["摄影", "散步", "日出"], coverQuery: "seaside sunrise photography" },
  { category: "户外", title: "周末植物园轻徒步", description: "选择坡度较缓的路线边走边看植物，全程保持慢节奏并安排休息。", location: "植物园西门", capacity: 10, hour: 9, duration: 4, tags: ["徒步", "植物"], coverQuery: "botanical garden hiking trail" },
  { category: "户外", title: "环岛路骑行小队", description: "沿海岸线骑行约十五公里，中途拍照补水，新手可按体力缩短路线。", location: "白城沙滩入口", capacity: 7, hour: 15, duration: 3, tags: ["骑行", "户外"], coverQuery: "coastal cycling group" },
  { category: "户外", title: "草坪野餐与飞盘", description: "自带一份小食，在草坪聊天、拍照和玩飞盘，雨天自动顺延。", location: "中心草坪", capacity: 12, hour: 15, duration: 3, tags: ["野餐", "飞盘"], coverQuery: "friends picnic grass frisbee" },

  { category: "学习", title: "图书馆专注自习晚场", description: "采用五十分钟学习、十分钟休息的节奏，进场前写下各自的学习目标。", location: "图书馆四楼", capacity: 10, hour: 19, duration: 3, tags: ["自习", "学习"], coverQuery: "students studying library" },
  { category: "学习", title: "英语口语轻松练习", description: "围绕校园生活和旅行话题进行英语交流，表达卡顿也没关系。", location: "外语楼共享空间", capacity: 8, hour: 19, duration: 2, tags: ["英语", "口语"], coverQuery: "language exchange students discussion" },
  { category: "学习", title: "前端项目结对编程", description: "两人一组完成一个小页面，轮流编写和讲解代码，结束后一起复盘。", location: "信息楼创新工坊", capacity: 6, hour: 14, duration: 3, tags: ["编程", "前端"], coverQuery: "students coding laptops workshop" },
  { category: "学习", title: "期末知识点互助答疑", description: "每人带来三个未解决的问题，按课程分组讨论并整理共享笔记。", location: "教学楼研讨室", capacity: 12, hour: 19, duration: 2, tags: ["期末", "互助学习"], coverQuery: "student group study classroom" },

  { category: "生活", title: "手冲咖啡入门体验", description: "一起认识咖啡豆和基础器具，在简单指导下完成自己的第一杯手冲。", location: "北门咖啡实验室", capacity: 6, hour: 15, duration: 2, tags: ["咖啡", "生活"], coverQuery: "pour over coffee workshop" },
  { category: "生活", title: "流浪猫公益喂养同行", description: "跟随校内志愿者了解科学喂养和绝育知识，一起补充固定点位的猫粮与清水。", location: "南区宿舍门口", capacity: 6, hour: 17, duration: 2, tags: ["猫咪", "公益"], coverQuery: "campus cat volunteer feeding" },
  { category: "生活", title: "宿舍收纳交换经验", description: "分享桌面和衣柜收纳方法，交换闲置收纳用品，让宿舍空间更清爽。", location: "生活服务中心", capacity: 8, hour: 19, duration: 2, tags: ["收纳", "宿舍"], coverQuery: "home organization storage workshop" },
  { category: "生活", title: "周末花艺小课堂", description: "学习基础配色和花束包装，材料现场均分，完成后可以带走自己的作品。", location: "大学生活动中心", capacity: 8, hour: 14, duration: 2, tags: ["花艺", "手作"], coverQuery: "flower arranging workshop" },

  { category: "社交", title: "破冰桌游欢乐局", description: "准备多款规则简单的聚会桌游，现场教学，适合第一次参加活动的同学。", location: "学生活动室 A", capacity: 10, hour: 19, duration: 3, tags: ["桌游", "社交"], coverQuery: "friends playing board games" },
  { category: "社交", title: "校园故事交换夜", description: "每个人带来一段最近发生的小故事，在轻松的氛围里认识新朋友。", location: "湖畔咖啡厅", capacity: 10, hour: 19, duration: 2, tags: ["聊天", "交友"], coverQuery: "friends talking cafe evening" },
  { category: "社交", title: "周末轻松歌唱局", description: "不比唱功，只点自己喜欢的歌，费用到场后按实际人数平摊。", location: "北门商圈 KTV", capacity: 8, hour: 19, duration: 3, tags: ["唱歌", "音乐"], coverQuery: "karaoke microphone", coverTitle: "File:Microphone on a karaoke night (Unsplash).jpg" },
  { category: "社交", title: "新生校园探索搭子", description: "一起熟悉教学楼、图书馆和常用服务点，老生也欢迎来分享经验。", location: "校史馆前广场", capacity: 12, hour: 16, duration: 2, tags: ["新生", "校园探索"], coverQuery: "university students campus tour" },

  { category: "美食", title: "火锅拼桌夜", description: "想吃火锅又凑不齐人就来拼桌，口味和预算提前沟通，餐费现场 AA。", location: "北门美食街", capacity: 8, hour: 18, duration: 2, tags: ["火锅", "美食"], coverQuery: "hot pot dinner friends" },
  { category: "美食", title: "烘焙曲奇体验", description: "从称量原料到烘烤一起完成曲奇，零基础可以参加，成品均分带走。", location: "劳动教育烘焙室", capacity: 8, hour: 14, duration: 3, tags: ["烘焙", "甜点"], coverQuery: "cookie baking workshop" },
  { category: "美食", title: "校园周边小吃地图", description: "沿学校周边步行探访四家小店，每家少量品尝，共同整理美食地图。", location: "学校西门", capacity: 6, hour: 17, duration: 3, tags: ["探店", "小吃"], coverQuery: "street food market friends" },
  { category: "美食", title: "甜品店新品探店", description: "一起尝试当季甜品和饮品，拍照交流口味，消费各自结算。", location: "中山路商圈", capacity: 6, hour: 15, duration: 2, tags: ["甜品", "探店"], coverQuery: "dessert cafe cakes" },

  { category: "艺术", title: "水彩明信片共创", description: "用水彩记录校园角落，互相交换完成的明信片，工具不足可提前说明。", location: "艺术楼公共画室", capacity: 8, hour: 14, duration: 3, tags: ["水彩", "绘画"], coverQuery: "watercolor painting workshop" },
  { category: "艺术", title: "陶艺捏塑体验", description: "从揉泥和基础造型开始，制作一件小器物，烧制费用按工作室标准结算。", location: "校外陶艺工作室", capacity: 6, hour: 14, duration: 3, tags: ["陶艺", "手作"], coverQuery: "pottery ceramics workshop" },
  { category: "艺术", title: "零基础舞蹈跟练", description: "学习一段节奏轻快的成品舞，分段练习并录制最后的集体版本。", location: "风雨操场舞蹈室", capacity: 12, hour: 19, duration: 2, tags: ["舞蹈", "运动"], coverQuery: "dance rehearsal studio group" },
  { category: "艺术", title: "草坪吉他弹唱会", description: "带上乐器或直接来听歌，轮流分享会唱的曲目，音量保持适度。", location: "芙蓉湖草坪", capacity: 15, hour: 18, duration: 2, tags: ["吉他", "音乐"], coverQuery: "acoustic guitar outdoor friends" },

  { category: "文化", title: "博物馆周末看展", description: "结伴参观当期展览，各自慢慢观看，结束后找地方交流喜欢的展品。", location: "厦门市博物馆入口", capacity: 8, hour: 10, duration: 4, tags: ["展览", "博物馆"], coverQuery: "museum exhibition visitors" },
  { category: "文化", title: "经典电影映后交流", description: "一起观看一部经典影片，结束后围绕角色、镜头和主题自由交流。", location: "人文学院放映室", capacity: 16, hour: 19, duration: 3, tags: ["电影", "文化"], coverQuery: "cinema film screening audience" },
  { category: "文化", title: "青年读书分享会", description: "提前阅读推荐短篇，现场分享打动自己的段落和不同理解。", location: "图书馆报告厅", capacity: 12, hour: 15, duration: 2, tags: ["读书", "分享"], coverQuery: "book club discussion library" },
  { category: "文化", title: "毛笔字入门练习", description: "认识基本笔画和握笔姿势，从简单的字开始临摹，纸墨由组织者准备。", location: "国学社活动室", capacity: 10, hour: 14, duration: 2, tags: ["书法", "传统文化"], coverQuery: "Chinese calligraphy brush workshop" },
].map((activity, index) => ({
  ...activity,
  cover: `bulk-${String(index + 1).padStart(2, "0")}.jpg`,
  dayOffset: 3 + index,
}));

