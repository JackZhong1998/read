import type { AgeGroup, Gender } from "./types";

export interface TopicQuestion {
  id: string;
  label: string;
  prompt: string;
}

const QUESTIONS: Record<AgeGroup, Record<Gender, TopicQuestion[]>> = {
  "18-25": {
    male: [
      { id: "m1", label: "人生方向", prompt: "我刚进入社会，常常感到迷茫，不知道人生的方向在哪里，你能帮我理清思路吗？" },
      { id: "m2", label: "恋爱困惑", prompt: "在感情里我总是患得患失，不知道怎样建立一段健康的关系。" },
      { id: "m3", label: "职场起步", prompt: "职场新人如何快速找到自己的位置，不被焦虑裹挟？" },
      { id: "m4", label: "财务启蒙", prompt: "刚工作不久，想建立正确的金钱观和理财习惯，从哪里开始？" },
      { id: "m5", label: "自我认同", prompt: "社交媒体让我 constantly 比较，怎样找到真实的自我？" },
    ],
    female: [
      { id: "f1", label: "人生意义", prompt: "二十出头的年纪，总忍不住追问：活着到底为了什么？" },
      { id: "f2", label: "情感焦虑", prompt: "在感情中容易内耗，怎样学会爱自己、也学会被爱？" },
      { id: "f3", label: "职场竞争", prompt: "作为年轻女性，怎样在职场中找到自己的声音和力量？" },
      { id: "f4", label: "经济独立", prompt: "经济独立对我意味着什么？怎样建立财务安全感？" },
      { id: "f5", label: "自我成长", prompt: "想成为一个更有深度的人，但不知道从哪里开始阅读和学习。" },
    ],
    other: [
      { id: "o1", label: "人生方向", prompt: "年轻的我常常感到迷茫，你能帮我找到一些人生方向的线索吗？" },
      { id: "o2", label: "情感归属", prompt: "在亲密关系中，我怎样找到真正的归属感？" },
      { id: "o3", label: "职场探索", prompt: "初入职场，怎样在不确定中找到自己的节奏？" },
      { id: "o4", label: "财务规划", prompt: "年轻人应该怎样建立健康的金钱观？" },
      { id: "o5", label: "内心平静", prompt: "信息爆炸的时代，怎样保持内心的专注与平静？" },
    ],
  },
  "26-35": {
    male: [
      { id: "m1", label: "事业瓶颈", prompt: "工作几年了，感觉遇到了天花板，怎样突破当前的困境？" },
      { id: "m2", label: "财务规划", prompt: "到了该认真规划财富的阶段，有哪些经典智慧值得借鉴？" },
      { id: "m3", label: "婚恋压力", prompt: "周围人都在谈婚论嫁，我却被各种压力裹挟，怎样看清内心？" },
      { id: "m4", label: "人生意义", prompt: "三十前后，开始认真思考：我这一生到底要追求什么？" },
      { id: "m5", label: "身心平衡", prompt: "工作占据了太多时间，怎样在拼搏与休息之间找到平衡？" },
    ],
    female: [
      { id: "f1", label: "职场家庭", prompt: "事业和家庭的拉扯让我疲惫，有没有书籍能给我一些智慧？" },
      { id: "f2", label: "财务安全", prompt: "想为自己建立更稳固的财务基础，有哪些值得读的经典？" },
      { id: "f3", label: "情感归属", prompt: "在关系中常常感到孤独，即使身边有人，这是为什么？" },
      { id: "f4", label: "自我实现", prompt: "除了工作，我还想找到真正属于自己的人生使命。" },
      { id: "f5", label: "焦虑缓解", prompt: "这个年龄段的焦虑像背景音一样挥之不去，怎样与之共处？" },
    ],
    other: [
      { id: "o1", label: "事业转型", prompt: "感觉当前路径不是最终答案，怎样探索新的可能性？" },
      { id: "o2", label: "财富智慧", prompt: "想更深入理解金钱与人生的关系，有什么书推荐？" },
      { id: "o3", label: "关系深度", prompt: "怎样建立更深层、更真实的亲密关系？" },
      { id: "o4", label: "生命意义", prompt: "开始认真追问存在的意义，哪些经典能给我启发？" },
      { id: "o5", label: "内在力量", prompt: "怎样在压力中保持内心的稳定与力量？" },
    ],
  },
  "36-45": {
    male: [
      { id: "m1", label: "中年危机", prompt: "中年了，开始怀疑过去的选择，这种危机感的本质是什么？" },
      { id: "m2", label: "财富积累", prompt: "到了积累财富的关键期，有哪些跨越时代的智慧？" },
      { id: "m3", label: "亲子关系", prompt: "作为父亲，怎样给孩子最好的精神滋养？" },
      { id: "m4", label: "职业转型", prompt: "是否该换赛道？怎样理性评估人生的下半场？" },
      { id: "m5", label: "生命意义", prompt: "成功之后反而感到空虚，人生的意义究竟在哪里？" },
    ],
    female: [
      { id: "f1", label: "家庭平衡", prompt: "家庭、事业、自我，三者之间怎样找到那个微妙的平衡？" },
      { id: "f2", label: "职业天花板", prompt: "感觉触到了性别的隐形天花板，有哪些书给我力量？" },
      { id: "f3", label: "健康焦虑", prompt: "身体开始出现信号，怎样以更智慧的方式面对衰老？" },
      { id: "f4", label: "自我价值", prompt: "为家庭付出了很多，怎样重新找回属于自己的价值感？" },
      { id: "f5", label: "情感治愈", prompt: "有些旧伤还在，哪些文字能真正治愈内心？" },
    ],
    other: [
      { id: "o1", label: "人生中场", prompt: "人生中场休息，怎样重新校准方向？" },
      { id: "o2", label: "财富智慧", prompt: "这个阶段应该建立怎样的财富观？" },
      { id: "o3", label: "家庭关系", prompt: "怎样在家庭中保持自我，也给予家人最好的陪伴？" },
      { id: "o4", label: "职业智慧", prompt: "下半场的工作，应该追求什么？" },
      { id: "o5", label: "心灵富足", prompt: "物质渐丰，心灵却时常空虚，怎样获得真正的富足？" },
    ],
  },
  "46-55": {
    male: [
      { id: "m1", label: "退休规划", prompt: "离退休越来越近，怎样规划人生的下一个阶段？" },
      { id: "m2", label: "传承意义", prompt: "想给后代留下些什么，不只是财富，更是智慧？" },
      { id: "m3", label: "健康忧虑", prompt: "身体的变化让我开始认真面对 mortality，有哪些智慧？" },
      { id: "m4", label: "婚姻沉淀", prompt: "几十年的婚姻，怎样让感情焕发新的深度？" },
      { id: "m5", label: "精神富足", prompt: "物质够了，精神的世界怎样继续丰富？" },
    ],
    female: [
      { id: "f1", label: "空巢适应", prompt: "孩子长大了，怎样重新找到属于自己的生活重心？" },
      { id: "f2", label: "自我重生", prompt: "感觉可以重新开始了，哪些书能给我勇气和方向？" },
      { id: "f3", label: "健康养护", prompt: "怎样以更智慧、更从容的方式照顾自己的身心？" },
      { id: "f4", label: "情感释放", prompt: "有些情绪压抑了很多年，现在想真正释放和疗愈。" },
      { id: "f5", label: "人生回顾", prompt: "想回顾这半生，哪些书能帮我更好地理解走过的路？" },
    ],
    other: [
      { id: "o1", label: "人生下半场", prompt: "怎样规划人生的下半场，让它比上半场更精彩？" },
      { id: "o2", label: "智慧传承", prompt: "想把一生的智慧传递下去，从哪里开始？" },
      { id: "o3", label: "健康智慧", prompt: "怎样与身体的变化和平相处？" },
      { id: "o4", label: "关系深度", prompt: "怎样让长久的关系焕发新的生命力？" },
      { id: "o5", label: "内心安宁", prompt: "追求了半生的外在，现在想找到内心的真正安宁。" },
    ],
  },
  "55+": {
    male: [
      { id: "m1", label: "生命意义", prompt: "走过大半生，想更深刻地理解活着的意义。" },
      { id: "m2", label: "晚年安乐", prompt: "怎样在晚年找到安乐与满足？" },
      { id: "m3", label: "祖孙之乐", prompt: "作为祖父，怎样给孙辈最好的精神礼物？" },
      { id: "m4", label: "智慧传承", prompt: "一生的阅历，怎样化为可以传递的智慧？" },
      { id: "m5", label: "心灵平静", prompt: "哪些文字能带给人最深层的平静与释然？" },
    ],
    female: [
      { id: "f1", label: "人生智慧", prompt: "想把一生的感悟沉淀下来，哪些书与我的经历共鸣？" },
      { id: "f2", label: "优雅老去", prompt: "怎样优雅、从容地迎接生命的每一个阶段？" },
      { id: "f3", label: "家族情感", prompt: "家族的情感纽带，怎样在文字中找到理解和慰藉？" },
      { id: "f4", label: "心灵自由", prompt: "终于可以有更多时间给自己，怎样获得真正的心灵自由？" },
      { id: "f5", label: "生命回顾", prompt: "回顾这一生，哪些经典能帮我更好地理解命运与选择？" },
    ],
    other: [
      { id: "o1", label: "生命意义", prompt: "走过漫长岁月，想更深入地理解生命的意义。" },
      { id: "o2", label: "内心安宁", prompt: "哪些阅读能带给人最深层的安宁？" },
      { id: "o3", label: "家族传承", prompt: "想把智慧留给后人，从哪里开始？" },
      { id: "o4", label: "优雅岁月", prompt: "怎样让每个日子都过得有质量、有意义？" },
      { id: "o5", label: "智慧之书", prompt: "推荐一些能陪伴晚年的经典好书吧。" },
    ],
  },
};

export function getTopicQuestions(gender: Gender, ageGroup: AgeGroup): TopicQuestion[] {
  return QUESTIONS[ageGroup][gender];
}

export function getGenderLabel(gender: Gender): string {
  const map: Record<Gender, string> = { male: "男", female: "女", other: "其他" };
  return map[gender];
}

export function getAgeLabel(ageGroup: AgeGroup): string {
  const map: Record<AgeGroup, string> = {
    "18-25": "18-25岁",
    "26-35": "26-35岁",
    "36-45": "36-45岁",
    "46-55": "46-55岁",
    "55+": "55岁以上",
  };
  return map[ageGroup];
}
