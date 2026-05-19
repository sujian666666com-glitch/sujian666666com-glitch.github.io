#!/usr/bin/env python3
"""Generate a daily cover image prompt for daily news posts."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import random


STYLE_TYPES = [
    "洛丽塔风：甜美、复古、精致裙装、蕾丝与蝴蝶结",
    "JK 制服风：校园感、百褶裙、衬衫、领结、青春日常",
    "御姐职场风：西装、衬衫、高跟鞋、成熟干练",
    "清纯邻家风：白裙、针织衫、自然妆、温柔干净",
    "赛博朋克风：霓虹灯、机能服、未来城市、科技感",
    "和风少女风：浴衣、樱花、神社、日式街巷",
    "国风古典风：汉服、团扇、亭台楼阁、东方美学",
    "海边度假风：长裙、草帽、海风、夏日旅行感",
    "居家慵懒风：宽松毛衣、卧室、阳光、咖啡与书",
    "街拍潮流风：短外套、牛仔、墨镜、城市街头",
]

PERSONAS = [
    "御姐型：成熟、自信、冷静、有压迫感",
    "清纯型：干净、自然、温柔、学生感",
    "元气型：活泼、开朗、笑容明亮",
    "文艺型：安静、书卷气、喜欢阅读和咖啡",
    "高冷型：眼神疏离、表情克制、气场强",
    "温柔姐姐型：亲和、成熟、治愈感强",
    "甜妹型：可爱、明亮、亲切、少女感",
    "运动型：健康、阳光、利落、有活力",
    "神秘型：低调、夜色、暗调、故事感强",
    "精英型：理性、专业、都市白领气质",
]

SCENES = [
    "咖啡店窗边：午后阳光、咖啡、笔记本电脑",
    "校园操场：黄昏、跑道、教学楼、青春感",
    "城市夜景：霓虹、街灯、雨后路面、电影感",
    "海边栈道：落日、海风、长发、旅行感",
    "卧室书桌：电脑、便签、植物、生活化日常",
    "图书馆：书架、暖光、安静阅读、文艺感",
    "地铁站：人流、灯箱、通勤、都市孤独感",
    "樱花街道：春日、粉色花瓣、轻盈氛围",
    "天台夜风：城市远景、晚风、自由感",
    "雨天窗边：玻璃水珠、柔光、安静情绪",
]

SAFETY_PROMPT = (
    "成年女性，服装完整覆盖私密部位，不透明，不湿身，不破损，不低俗，"
    "不强调胸部、臀部或身体特写，画面自然高级，适合作为博客封面、头像或日更插画素材。"
)

COMMON_PROMPT = (
    "原创成年女性角色，横向博客封面构图，画面自然随意，有生活感和故事感。"
    "风格可以高级、有吸引力，可以略微清凉或成熟时尚，但不要露骨。"
    "不要出现可读文字，不要出现公司 Logo，不要真实公众人物肖像，不要模仿已有版权角色。"
)

ADULT_GUARD = (
    "如果组合里出现校园感、学生感或 JK 制服风，请明确表现为成年女性的学院风/制服风时尚穿搭，"
    "避免未成年感，避免高中生语境，避免性化校园场景。"
)


def stable_seed(date_text: str) -> int:
    digest = hashlib.sha256(date_text.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def build_prompt(date_text: str) -> dict[str, str]:
    rng = random.Random(stable_seed(date_text))
    style = rng.choice(STYLE_TYPES)
    persona = rng.choice(PERSONAS)
    scene = rng.choice(SCENES)

    prompt = (
        f"{COMMON_PROMPT}\n\n"
        f"今日组合：{style} × {persona} × {scene}。\n\n"
        f"请围绕这个组合自由发挥动作、表情和细节，不要把画面做得太严肃。"
        f"可以是回头看镜头、喝咖啡、整理头发、散步、坐着休息、看书、拿手机、听音乐、看风景等自然动作。\n\n"
        f"{SAFETY_PROMPT}\n"
        f"{ADULT_GUARD}"
    )

    return {
        "date": date_text,
        "style": style,
        "persona": persona,
        "scene": scene,
        "safety_prompt": SAFETY_PROMPT,
        "prompt": prompt,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a stable daily image prompt from style/persona/scene pools."
    )
    parser.add_argument(
        "--date",
        default=dt.date.today().isoformat(),
        help="Date seed in YYYY-MM-DD format. Defaults to today.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print JSON with selected fields and prompt.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = build_prompt(args.date)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    print(result["prompt"])


if __name__ == "__main__":
    main()
