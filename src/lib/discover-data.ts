import type { AgeGroup, Gender } from "./types";

export interface DiscoverEntry {
  question: string;
  bookTitle: string;
  tagline: string;
}

export interface DiscoverItem extends DiscoverEntry {
  id: string;
  prompt: string;
}

export const AGE_GROUP_OPTIONS: { value: AgeGroup; label: string; range: string }[] = [
  { value: "under-12", label: "初中以下", range: "6-12 岁" },
  { value: "12-18", label: "初高中", range: "12-18 岁" },
  { value: "18-22", label: "大学", range: "18-22 岁" },
  { value: "22-30", label: "职场新人", range: "22-30 岁" },
  { value: "30-40", label: "而立之年", range: "30-40 岁" },
  { value: "40-50", label: "不惑之年", range: "40-50 岁" },
  { value: "50+", label: "知天命", range: "50 岁以上" },
];

type DiscoverCatalog = Record<AgeGroup, DiscoverEntry[]>;

const MALE: DiscoverCatalog = {
  "under-12": [
    { question: "为什么同学好像不喜欢和我玩？", bookTitle: "《小王子》", tagline: "学会用心去看，你会明白友谊与责任。" },
    { question: "我总控制不住打游戏/看视频，怎么办？", bookTitle: "《查理和巧克力工厂》", tagline: "自律的孩子，才会赢得人生的 golden ticket。" },
    { question: "被大孩子欺负了，该不该告诉老师？", bookTitle: "《洞》", tagline: "命运里的坏运气，靠勇气和友谊就能挖穿。" },
    { question: "爸妈总拿我和别人比，我很烦。", bookTitle: "《了不起的狐狸爸爸》", tagline: "智慧与乐观，是面对挑剔眼光最好的武器。" },
    { question: "为什么我要学那么多没用的东西？", bookTitle: "《数学魔咒》", tagline: "知识是解开世界魔咒的密码，不信你试试。" },
    { question: "怎样才能变勇敢，不怕黑、不怕虫子？", bookTitle: "《手斧男孩》", tagline: "真正的勇敢是在荒野里相信自己能活下来。" },
    { question: "朋友都有的东西，我没有，很丢人吗？", bookTitle: "《一百条裙子》", tagline: "比拥有更重要的，是理解与善良。" },
    { question: "做错事了，怎样道歉才不会更丢脸？", bookTitle: "《我亲爱的甜橙树》", tagline: "温柔能融化错误，让你在泪水中长大。" },
    { question: "爸爸总不在家，是不是不爱我？", bookTitle: "《父与子》漫画全集", tagline: "爱藏在不说话的行动里，你会笑着读懂父亲。" },
    { question: "我长大后能成为超级英雄吗？", bookTitle: "《神奇树屋》系列", tagline: "翻开书，你就是跨越时空的探险英雄。" },
  ],
  "12-18": [
    { question: "我好像喜欢上了一个人，这正常吗？", bookTitle: "《少年维特的烦恼》", tagline: "第一次心动是风暴，但它教会你分辨激情与爱。" },
    { question: "成绩忽上忽下，是不是我就这水平了？", bookTitle: "《终身成长》", tagline: "你还没定型，现在的分数只是起点，不是判决。" },
    { question: "爸妈完全不理解我，除了学习什么都不让干。", bookTitle: "《麦田里的守望者》", tagline: "霍尔顿替你骂出脏话，然后带你找到心中的麦田。" },
    { question: "好哥们突然疏远我，我做错了什么？", bookTitle: "《追风筝的人》", tagline: "为你千千万万遍，真挚友谊需要直面懦弱去挽回。" },
    { question: "我为什么老控制不住发脾气？", bookTitle: "《苏菲的世界》", tagline: "把怒气升华为对世界的好奇，哲学是最好的镇定剂。" },
    { question: "长得不帅、体育不好，就没人看得起我吗？", bookTitle: "《驭风少年》", tagline: "在非洲废料堆里造出风车，才华才是男人的肌肉。" },
    { question: "未来要干什么，我一点方向都没有。", bookTitle: "《你想活出怎样的人生》", tagline: "小哥白尼的笔记，让你勇敢追问人生的意义。" },
    { question: "感觉活着很累，没什么值得开心的事。", bookTitle: "《活着》", tagline: "见识过生命之重，会珍惜窗外的每缕阳光。" },
    { question: "融不进班里主流的圈子，要硬挤吗？", bookTitle: "《寂寞的游戏》", tagline: "敏锐的孤独感也能是宝藏，不必强行合群。" },
    { question: "怎样才算真正的酷？", bookTitle: "《老人与海》", tagline: "可以被毁灭，不能被打败，这他妈才叫酷。" },
  ],
  "18-22": [
    { question: "选的专业不喜欢，该转行还是死扛？", bookTitle: "《史蒂夫·乔布斯传》", tagline: "连点成线，你热爱的碎片终将串联出未来。" },
    { question: "如何追到喜欢的女孩，又不显得舔狗？", bookTitle: "《爱的艺术》", tagline: "爱不是被爱的问题，是你有没有能力去爱。" },
    { question: "舍友总占便宜、打游戏到半夜，怎样不撕破脸？", bookTitle: "《非暴力沟通》", tagline: "四步把冲突变成深度连接，不憋屈也不撕破脸。" },
    { question: "大家都卷实习、卷绩点，我该跟着卷吗？", bookTitle: "《优秀的绵羊》", tagline: "戳破精英教育的泡沫，看清你卷的到底是什么。" },
    { question: "第一次感到自己很平庸，怎么接受？", bookTitle: "《莫斯科绅士》", tagline: "在狭窄的阁楼里，绅士也能活出辽阔的精神世界。" },
    { question: "和原生家庭观念冲突剧烈，如何和解？", bookTitle: "《你当像鸟飞往你的山》", tagline: "教育是翅膀，让你飞离伤痛的原生山脉。" },
    { question: "钱不够花又不想跟家里要，如何破局？", bookTitle: "《穷爸爸富爸爸》", tagline: "财商启蒙第一课，让钱为你工作而非相反。" },
    { question: "恋爱中欲望与责任的边界在哪？", bookTitle: "《挪威的森林》", tagline: "在生与死、性与爱的边界迷失，然后带着疑问活下去。" },
    { question: "读了很多书，为什么还是过不好这四年？", bookTitle: "《如何阅读一本书》", tagline: "不是读不够，是你还没学会让书为你效力。" },
    { question: "怎样找到真正值得一辈子投入的事业方向？", bookTitle: "《牧羊少年奇幻之旅》", tagline: "天命就是你一直梦想去做的事，宇宙会合力助你。" },
  ],
  "22-30": [
    { question: "第一份工作很烂，要裸辞吗？", bookTitle: "《斯坦福大学人生设计课》", tagline: "把人生当产品迭代，烂工作只是第一个糟糕原型。" },
    { question: "在大城市硬撑还是回家考编？", bookTitle: "《皮囊》", tagline: "故乡的回声帮你判断，肉身该安放在何处。" },
    { question: "谈恋爱花钱如流水，怎样存下钱？", bookTitle: "《小狗钱钱》", tagline: "养一只下金蛋的鹅，从500元开始。" },
    { question: "同期入职的同事升职了，心态崩了怎么办？", bookTitle: "《被讨厌的勇气》", tagline: "卸下别人的课题，专注于你自己的赛道。" },
    { question: "如何让领导看见自己的努力而不显得刻意？", bookTitle: "《影响力》", tagline: "让业绩替你说话，用互惠原理赢得贵人。" },
    { question: "被社会毒打到怀疑人生，怎样重建自信？", bookTitle: "《曾国藩传》", tagline: "他一个「天下至拙」的人，能胜天下至巧。" },
    { question: "女朋友嫌我不成熟，什么是真正的成熟？", bookTitle: "《少有人走的路》", tagline: "成熟就是直面问题、承担责任，而非逃避痛苦。" },
    { question: "父母催婚，但我根本没准备好，该妥协吗？", bookTitle: "《围城》", tagline: "看清婚姻这座城，才知何时该进、何时不盲从。" },
    { question: "好兄弟都渐行渐远，成年人的友谊如何维系？", bookTitle: "《三体》", tagline: "宇宙很大，情义可以跨光年，老友总能在引力波里重逢。" },
    { question: "我到底想要什么，为什么越来越迷茫？", bookTitle: "《德米安》", tagline: "每个人的生命都是通向自我的征途，迷惘是路标。" },
  ],
  "30-40": [
    { question: "职场瓶颈清晰可见，副业或跳槽怎么选？", bookTitle: "《原则》", tagline: "达利欧给你一套算法，把中年瓶颈变成可突破的原则。" },
    { question: "房贷、车贷、养娃，压得喘不过气，如何破局？", bookTitle: "《富爸爸·财务自由之路》", tagline: "从E象限爬向I象限，让系统扛住压你的重担。" },
    { question: "和妻子的激情耗尽，只剩亲情和责任，正常吗？", bookTitle: "《爱的五种语言》", tagline: "换一种服务或肯定的语言，给婚姻重新充电。" },
    { question: "孩子教育极度焦虑，要不要砸锅卖铁买学区房？", bookTitle: "《教养的迷思》", tagline: "家长的影响力没你想的那么大，放过自己和孩子。" },
    { question: "体检报告亮红灯，开始怕死怎么办？", bookTitle: "《每个人的战争》", tagline: "抗癌医生的忠告：生活方式就是你最强的免疫力。" },
    { question: "看着年轻人快速崛起，感觉自己被淘汰了。", bookTitle: "《百岁人生》", tagline: "你的职业生涯还有60年，现在只是中场休息。" },
    { question: "父亲突然生病，才发现自己还没准备好成为顶梁柱。", bookTitle: "《爸爸军团》", tagline: "一位父亲临终前给女儿留下的10个替代爸爸的男人。" },
    { question: "创业的想法一直有，该如何评估风险？", bookTitle: "《低风险创业》", tagline: "用杠铃策略保护家人，同时让梦想安全起飞。" },
    { question: "没什么真心朋友，饭局都是资源互换，内心很空。", bookTitle: "《男性的衰落》", tagline: "卸下「男子气概」的包袱，允许自己疲惫和需要拥抱。" },
    { question: "人生过半，是不是只能这样了？", bookTitle: "《活出生命的意义》", tagline: "奥斯维辛走出的心理学家告诉你：任何境遇下都能选择态度。" },
  ],
  "40-50": [
    { question: "工作没激情，退休又太早，这十年怎么熬？", bookTitle: "《远见》", tagline: "用三大职业阶段思维，把最后十年的燃料烧旺。" },
    { question: "离婚还是将就，下半辈子怎么过？", bookTitle: "《亲密关系》", tagline: "撕下浪漫幻觉，用科学研究重建深刻的伴侣情谊。" },
    { question: "身体机能下降明显，如何延缓衰老？", bookTitle: "《超越百岁》", tagline: "医学3.0时代，精准管理健康寿命，现在不晚。" },
    { question: "孩子进入叛逆期/离巢期，该如何沟通？", bookTitle: "《解码青春期》", tagline: "把自己变成「罗德尼」，成为孩子转身就能抓住的扶手。" },
    { question: "父母相继离开，感觉自己成了「孤儿」。", bookTitle: "《当呼吸化为空气》", tagline: "神经外科医生的临终手记，悼念父母也安顿自己。" },
    { question: "奋斗半生到底图什么？意义危机袭来。", bookTitle: "《与神对话》", tagline: "不是宗教，是一次直面终极意义的内在创世。" },
    { question: "投资理财经常踩坑，如何保住养老钱？", bookTitle: "《客户的游艇在哪里》", tagline: "用幽默刺破华尔街谎言，守住血汗钱。" },
    { question: "身边同龄人突然走了几个，如何面对死亡焦虑？", bookTitle: "《最好的告别》", tagline: "理解衰老与死亡，是为了更好地活剩下的每一天。" },
    { question: "想给人生换个赛道，还来得及吗？", bookTitle: "《人生由我》", tagline: "梅耶·马斯克告诉你，60岁也能在T台重新绽放。" },
    { question: "怎样才能做个好榜样，而不是一个说教的老爸？", bookTitle: "《杀死一只知更鸟》", tagline: "做个像阿迪克斯一样的父亲：正直、勇敢、温和。" },
  ],
  "50+": [
    { question: "退休后突然失去身份感，整天无所事事。", bookTitle: "《百年孤独》", tagline: "奥雷里亚诺上校做小金鱼的循环，正是晚年新秩序。" },
    { question: "年轻时没完成的事，还要不要去追？", bookTitle: "《月亮与六便士》", tagline: "就算60岁去塔希提画画，灵魂也会为你让路。" },
    { question: "怎样和已成年的孩子保持亲密又不越界？", bookTitle: "《亲爱的安德烈》", tagline: "龙应台与儿子的36封家书，示范成年母子的边界与爱。" },
    { question: "老友逐渐凋零，社交圈急剧萎缩。", bookTitle: "《一个人最后的旅程》", tagline: "上野千鹤子告诉你，即使独居也能构建最后的安全网。" },
    { question: "记忆力变差，害怕老年痴呆怎么办？", bookTitle: "《逆龄大脑》", tagline: "12周实操方案，让大脑比以前更敏锐。" },
    { question: "夫妻终于整天相对，摩擦反而更多了。", bookTitle: "《幸福的婚姻》", tagline: "戈特曼教授40年研究精华，老来伴也可以重新相爱。" },
    { question: "面对医疗抉择，如何有尊严地掌控晚年？", bookTitle: "《临终抉择》", tagline: "用清晰清单决定如何告别，把尊严握在自己手里。" },
    { question: "想把一生的经验留给孙辈，怎么说他们才听？", bookTitle: "《外公是棵樱桃树》", tagline: "温柔地告诉孩子，人生如四季，爱会留在果实里。" },
    { question: "如何放下对死亡的恐惧，安享当下？", bookTitle: "《西藏生死书》", tagline: "把死亡当成最尊贵的导师，而非可怕的敌人。" },
    { question: "这辈子活得值不值？如何与自己和解？", bookTitle: "《活好》", tagline: "105岁日野原重明说：生命的价值，是你爱过多少人。" },
  ],
};

const FEMALE: DiscoverCatalog = {
  "under-12": [
    { question: "好朋友和别人玩了，我很伤心怎么办？", bookTitle: "《绿山墙的安妮》", tagline: "红发安妮教你用想象力把失去变成另一种获得。" },
    { question: "我有点胖/戴牙套，被人取笑，如何变自信？", bookTitle: "《小公主》", tagline: "即使穿着破烂，心里住着公主就没人能践踏你的尊严。" },
    { question: "为什么爸爸妈妈好像更爱弟弟/妹妹？", bookTitle: "《秘密花园》", tagline: "当荒原的玫瑰绽放，被冷落的心也能复苏。" },
    { question: "班里要演节目我不敢上台，怎么变大胆？", bookTitle: "《纸袋公主》", tagline: "公主也能斗恶龙救王子，然后潇洒选择不要他。" },
    { question: "世界上真的有公主吗，我能当公主吗？", bookTitle: "《爱丽丝梦游仙境》", tagline: "真正的公主敢掉进兔子洞，对荒诞世界说「这不过是场梦」。" },
    { question: "数学/科学太难了，女孩是不是真的学不好？", bookTitle: "《谁是爱因斯坦？》", tagline: "好奇心不分男女，你可以是任何领域的探险家。" },
    { question: "妈妈总让我让着别人，凭什么？", bookTitle: "《我有友情要出租》", tagline: "友情不是让来的，是大猩猩举起的饼干和维尼的蜂蜜。" },
    { question: "被人冤枉偷东西，如何证明清白？", bookTitle: "《蓝色的海豚岛》", tagline: "独自在孤岛18年，卡拉娜用勇敢和技艺书写清白。" },
    { question: "好朋友让我一起撒谎，要不要答应？", bookTitle: "《窗边的小豆豆》", tagline: "说谎是因为害怕，巴学园告诉你诚实才是被爱的前提。" },
    { question: "怎样成为受欢迎又善良的人？", bookTitle: "《夏洛的网》", tagline: "倾尽生命编织出「王牌猪」，这是最高级的善良与友谊。" },
  ],
  "12-18": [
    { question: "长了痘痘、发胖，对自己外貌极度不满。", bookTitle: "《简·爱》", tagline: "「你以为我穷、不好看就没有灵魂吗？」昂起头先爱自己。" },
    { question: "暗恋的人不喜欢我，该如何放下？", bookTitle: "《傲慢与偏见》", tagline: "达西先生的蜕变告诉你，爱需要修正偏见，也值得等待。" },
    { question: "闺蜜背地里说我坏话，还拉着别人孤立我。", bookTitle: "《萤火虫小巷》", tagline: "三十年的友谊会刺伤你、拯救你，最终让你懂得姐妹的含义。" },
    { question: "父母管制太严，偷看日记、翻手机，该怎么办？", bookTitle: "《无声告白》", tagline: "过度的爱与期待会勒死一个人，这是与父母和解的开端。" },
    { question: "努力了成绩还是很差，是不是我天生笨？", bookTitle: "《你当像鸟飞往你的山》", tagline: "在垃圾场长大，17岁前没上过学，照样飞往剑桥。" },
    { question: "班里有人开黄腔，我很不舒服又不敢怼回去。", bookTitle: "《房思琪的初恋乐园》", tagline: "用痛楚学会辨识世界的恶，并勇敢说「不」。" },
    { question: "追星、看言情是不是就不「好」了？", bookTitle: "《82年生的金智英》", tagline: "你所有的喜欢和不喜欢，都值得被认真对待。" },
    { question: "对未来迷茫，感觉自己什么都做不到。", bookTitle: "《风雨哈佛路》", tagline: "父母吸毒、流浪街头，她告诉自己「我命由我不由天」。" },
    { question: "看到不公平的事（如霸凌），要不要出头？", bookTitle: "《杀死一只知更鸟》", tagline: "斯库特站在人群中那一喊，是勇气的最高形式。" },
    { question: "怎样才算独立、强大的女生？", bookTitle: "《小妇人》", tagline: "四姐妹用不同人生回答：独立不是不婚，是自主选择。" },
  ],
  "18-22": [
    { question: "该趁年轻拼事业，还是听家里的考编求稳？", bookTitle: "《向前一步》", tagline: "坐到桌前，别在必须离开前就提前离场。" },
    { question: "第一次恋爱就遇到渣男，如何治愈并重建信任？", bookTitle: "《也许你该找个人聊聊》", tagline: "心理咨询师自己也在痛中暴露，愈合从说出故事开始。" },
    { question: "容貌/身材焦虑严重影响生活，怎么破？", bookTitle: "《身体由我》", tagline: "认识阴蒂、子宫，了解身体的说明书，拿回主权。" },
    { question: "消费主义洗脑，如何建立正确的金钱观？", bookTitle: "《工作、消费主义和新穷人》", tagline: "看清消费陷阱，你的价值不等于你购买的商品。" },
    { question: "极度在意他人评价，总想讨好怎么办？", bookTitle: "《被讨厌的勇气》", tagline: "课题分离，别人讨厌你是他的事，你只管活自己。" },
    { question: "总被灌输「女孩不用太强」，好窒息。", bookTitle: "《第二性》", tagline: "女人不是天生的，而是被塑造成的。看清它，摧毁它。" },
    { question: "性骚扰的边界在哪里，遭遇了该如何应对？", bookTitle: "《黑箱：日本之耻》", tagline: "伊藤诗织教你面对权势性侵，如何打破沉默。" },
    { question: "对学术/未来方向充满热情，但怕是一条死路。", bookTitle: "《别闹了，费曼先生》", tagline: "物理诺奖得主的疯癫人生：热爱能穿透一切死路。" },
    { question: "如何不嫉妒闺蜜的优秀，真心为她喝彩？", bookTitle: "《那不勒斯四部曲》", tagline: "莱农和莉拉一生的角力与扶持，嫉妒也可以化为灯塔。" },
    { question: "我的身体我做主，怎样和伴侣谈「性」不羞耻？", bookTitle: "《性学观止》", tagline: "扎实的科学知识，是谈性时脱掉羞耻内衣的第一步。" },
  ],
  "22-30": [
    { question: "单身被催婚，如何扛住压力不凑合？", bookTitle: "《单身女性的时代》", tagline: "单身从来不是「剩」，而是主动选择的新生活方式。" },
    { question: "工资月光，怎样不靠嫁人获得经济安全感？", bookTitle: "《富爸爸·女人一定要有钱》", tagline: "运用财务知识，自己买花自己戴，不用等别人送皇冠。" },
    { question: "面试/升职被问婚育计划，如何反击？", bookTitle: "《勇气》", tagline: "施压的问题不是你的软肋，练习用优雅的话术打回去。" },
    { question: "男友不上进，要陪他长大还是及时止损？", bookTitle: "《巴黎美人》", tagline: "一个不上进的法式男人，不如二十岁自在的公寓。" },
    { question: "一边鸡血奋斗，一边觉得自己是冒牌货（冒充者综合征）。", bookTitle: "《自信的陷阱》", tagline: "不是等不怕了才行动，是行动了才不再怕。" },
    { question: "原生家庭不停索取，如何设立边界又维持亲情？", bookTitle: "《原生家庭》", tagline: "苏珊·福沃德给你一套非辩护性沟通术，不撕破脸也能设界。" },
    { question: "闺蜜都结婚买房了，我漂在大城市对吗？", bookTitle: "《一个人的好天气》", tagline: "东京打零工女孩的春天，平淡却坚定地安慰着你的漂泊。" },
    { question: "被油腻男领导骚扰，怎么体面又安全地脱身？", bookTitle: "《关键对话》", tagline: "在危险时刻用「对比法」拒绝，既不激怒对方又保全自己。" },
    { question: "要不要读博/转行/出国，太怕选择错了。", bookTitle: "《斯坦福大学人生设计课》", tagline: "原型设计法：设计三个人生版本，低成本试错，不怕走错。" },
    { question: "如何学会真正爱自己，而不是等别人来爱？", bookTitle: "《当你开始爱自己，全世界都会来爱你》", tagline: "停止内耗，在你的王座上为自己加冕。" },
  ],
  "30-40": [
    { question: "生还是不生？生育对职业和身体的影响到底多大？", bookTitle: "《成为母亲》", tagline: "撕开母爱的完美谎言，坦诚生育的黑暗与重生。" },
    { question: "重返职场发现位置没了，如何破局？", bookTitle: "《远见》", tagline: "拉长到45年职业生涯，你此时只是长途的加油站。" },
    { question: "育儿责任压在自己身上，丈夫隐形，太累了。", bookTitle: "《第二座山》", tagline: "督促伴侣共攀「第二座山」，夫妻是人生最重的合伙人。" },
    { question: "为什么职场晋升总卡在女性头上？（玻璃天花板）", bookTitle: "《向前一步》", tagline: "依赖女性的「梯子伙伴」，一起撞碎隐形天花板。" },
    { question: "感觉自己被生活撕裂：好员工、好妈妈、好妻子不能共存。", bookTitle: "《我是个妈妈，我需要铂金包》", tagline: "在纽约上东区的荒诞里照见自己：系统性困境不是你一个人的错。" },
    { question: "和婆婆/妈妈的育儿冲突严重，家庭火药味十足。", bookTitle: "《有限责任家庭》", tagline: "李雪教你厘清家庭边界，课题分离，放下对长辈认可的渴求。" },
    { question: "身材走形、皮肤松弛，如何与衰老和解？", bookTitle: "《身体由我》", tagline: "知彼知己，抚平女性独特的衰老羞耻。" },
    { question: "发现丈夫精神/肉体出轨，要不要离？", bookTitle: "《婚姻：挑战》", tagline: "阿德勒式思考：婚姻的每个危机都是双方重新选择的契机。" },
    { question: "想提升自己/考研考证，时间从哪里来？", bookTitle: "《五种时间》", tagline: "王潇的时间折叠术，让你在折叠中重建自己的花园。" },
    { question: "在母亲角色之外，「我」到底是谁？", bookTitle: "《一间只属于自己的房间》", tagline: "伍尔夫的要求：500磅年薪和一把锁，你值得拥有精神自留地。" },
  ],
  "40-50": [
    { question: "更年期身心剧变，如何平稳度过？", bookTitle: "《炙热的你》", tagline: "更年期不是凋零，而是女性力量解放的盛夏。" },
    { question: "孩子离家，空巢的寂寞如何填补？", bookTitle: "《晚熟时代》", tagline: "当孩子离巢，你不必空巢，可以二次成熟。" },
    { question: "夫妻变成最熟悉的陌生人，要不要离婚？", bookTitle: "《幸福关系的7段旅程》", tagline: "重燃爱恋不是回到热恋，是建立更深层的亲密连接。" },
    { question: "父母年迈生病，工作+陪护如何两全？", bookTitle: "《一个人最后的旅程》", tagline: "提前规划与父母的最后时光，把负罪感转化为温暖护送。" },
    { question: "职业触顶/被边缘化，职场还有第二春吗？", bookTitle: "《人生由我》", tagline: "梅耶·马斯克：70岁迎来事业巅峰，你才刚到半场。" },
    { question: "积攒半辈子的婚姻委屈，如何消解？", bookTitle: "《不要用爱控制我》", tagline: "识别婚姻中的隐性控制，释放积压的情绪毒素。" },
    { question: "身体小毛病不断，如何重获活力？", bookTitle: "《免疫功能90天复原方案》", tagline: "用食物和节律，让发炎的身体重回轻盈。" },
    { question: "被「年轻文化」抛弃的感觉，如何找到新寄托？", bookTitle: "《秋园》", tagline: "一位80岁女儿书写她母亲跌宕的一生，联结起你的女性谱系。" },
    { question: "想为自己活一次，又恐惧「自私」的指控。", bookTitle: "《我必亲手重建我的生活》", tagline: "黄佟佟陪你用美好的器物、读书、旅行，重建只为自己的生活。" },
    { question: "如何面对容颜消逝，建立不被时间摧毁的自我价值？", bookTitle: "《优雅》", tagline: "晓雪告诉你，优雅不是胶原蛋白，是被岁月淬炼过的从容。" },
  ],
  "50+": [
    { question: "退休了，社会角色抽空，找不到价值感。", bookTitle: "《暮色将尽》", tagline: "89岁戴安娜·阿西尔坦率谈论衰老、无子和潇洒终老。" },
    { question: "成为婆婆/丈母娘，如何把握好边界？", bookTitle: "《婆婆攻心计》", tagline: "拆解中国式婆媳关系的困局，用智慧和界限获得尊重。" },
    { question: "丧偶/离异多年，晚年还能追求爱情吗？", bookTitle: "《霍乱时期的爱情》", tagline: "跨越半个世纪，弗洛伦蒂诺告诉你，晚年之爱同样盛大。" },
    { question: "健康大不如前，慢病缠身，如何管理？", bookTitle: "《超越百岁》", tagline: "主动干预慢病，目标是功能良好的长寿。" },
    { question: "几十年积蓄，如何不被忽悠，优雅理财？", bookTitle: "《理财产品根本性缺陷》", tagline: "识破套路，守住养老钱，晚年才真正属于自己。" },
    { question: "和孩子住一起压抑，独自住又孤单，怎么选？", bookTitle: "《在熟悉的家中向世界道别》", tagline: "上野千鹤子论证：独居在家也可以是最幸福的临终选择。" },
    { question: "如何总结、记录自己的一生，留下精神遗产？", bookTitle: "《人生回忆录写作指南》", tagline: "不需要文笔，用问题的引导，写出专属于你的生命之书。" },
    { question: "女儿/孙女等年轻后辈的女性观念，我看不惯怎么办？", bookTitle: "《亲爱的安吉维拉》", tagline: "抓住女权主义15条核心建议，把它装进给孙女的话语里。" },
    { question: "怎么学会不替全家人操心，真正放松下来？", bookTitle: "《断舍离》", tagline: "人生最后，放手一切杂物与挂碍，让身心彻底轻盈。" },
    { question: "临近生命终点，如何优雅地与这个世界告别？", bookTitle: "《当呼吸化为空气》", tagline: "完成向世界的告别，安宁地拥抱最后一场好觉。" },
  ],
};

function resolveGender(gender: Gender): "male" | "female" {
  return gender === "female" ? "female" : "male";
}

function buildPrompt(entry: DiscoverEntry): string {
  const title = entry.bookTitle.replace(/[《》]/g, "");
  return `我最近很困惑：${entry.question} 听说《${title}》能给我启发，能帮我推荐这本书并聊聊它吗？`;
}

function toItems(catalog: DiscoverCatalog, gender: Gender, ageGroup: AgeGroup): DiscoverItem[] {
  const source = resolveGender(gender) === "female" ? FEMALE : MALE;
  const entries = catalog[ageGroup] ?? source[ageGroup];
  return entries.map((entry, index) => ({
    ...entry,
    id: `${gender}-${ageGroup}-${index + 1}`,
    prompt: buildPrompt(entry),
  }));
}

export function getDiscoverItems(gender: Gender, ageGroup: AgeGroup): DiscoverItem[] {
  return toItems(resolveGender(gender) === "female" ? FEMALE : MALE, gender, ageGroup);
}

export function getAgeLabel(ageGroup: AgeGroup): string {
  const option = AGE_GROUP_OPTIONS.find((o) => o.value === ageGroup);
  return option ? `${option.label}（${option.range}）` : ageGroup;
}

export function getAgeShortLabel(ageGroup: AgeGroup): string {
  return AGE_GROUP_OPTIONS.find((o) => o.value === ageGroup)?.label ?? ageGroup;
}

export const LEGACY_AGE_MAP: Record<string, AgeGroup> = {
  "18-25": "18-22",
  "26-35": "22-30",
  "36-45": "30-40",
  "46-55": "40-50",
  "55+": "50+",
};

export const VALID_AGE_GROUPS: AgeGroup[] = AGE_GROUP_OPTIONS.map((o) => o.value);

export function normalizeAgeGroup(value: string): AgeGroup | null {
  const mapped = LEGACY_AGE_MAP[value] ?? value;
  return VALID_AGE_GROUPS.includes(mapped as AgeGroup) ? (mapped as AgeGroup) : null;
}
