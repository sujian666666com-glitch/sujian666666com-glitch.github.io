#!/usr/bin/env python3
"""Generate daily cover images through the CLPAI image API.

This script is intentionally API-only. It may call the existing
daily-cover-prompt.py helper to build a prompt, but it must not create a
fallback image locally.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_API_URL = "https://api.clpai.com"
DEFAULT_MODEL = "gemini-3-pro-image-preview"
MODELS = ("gemini-3-pro-image-preview", "gemini-3.1-flash-image-preview")

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
JPEG_MAGIC = b"\xff\xd8\xff"
WEBP_MAGIC = b"RIFF"


class HelpFormatter(argparse.ArgumentDefaultsHelpFormatter, argparse.RawDescriptionHelpFormatter):
    """Show defaults while preserving examples."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="通过 CLPAI 生成每日新闻封面图",
        formatter_class=HelpFormatter,
        epilog="""
Examples:
  CLPAI_API_KEY=... python3 scripts/generate-daily-cover-clpai.py --date 2026-05-25
  CLPAI_API_KEY=... python3 scripts/generate-daily-cover-clpai.py \\
      --date 2026-05-25 \\
      --model gemini-3.1-flash-image-preview \\
      --json-result
        """,
    )
    parser.add_argument("--date", required=True, help="日期，格式 YYYY-MM-DD")
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        choices=MODELS,
        help="CLPAI 生图模型",
    )
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help="CLPAI API 基础地址",
    )
    parser.add_argument(
        "--endpoint",
        default="/v1/images/generations",
        help="OpenAI-compatible image generation endpoint path",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="输出文件路径，默认 static/images/daily/YYYY-MM-DD-daily-news.png",
    )
    parser.add_argument(
        "--prompt",
        default=None,
        help="直接传入提示词；未传时调用 scripts/daily-cover-prompt.py",
    )
    parser.add_argument(
        "--size",
        default="16:9",
        help="传给上游 API 的尺寸/比例参数",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=180,
        help="API 和图片下载超时时间，秒",
    )
    parser.add_argument(
        "--json-result",
        action="store_true",
        help="打印结构化结果，便于自动化解析",
    )
    parser.add_argument(
        "--keep-response",
        default=None,
        metavar="PATH",
        help="保存脱敏后的 API 响应，便于排障",
    )
    return parser.parse_args()


def emit_error(code: str, message: str, *, detail: object | None = None) -> int:
    payload: dict[str, object] = {"status": "error", "code": code, "message": message}
    if detail is not None:
        payload["detail"] = detail
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    print(f"[ERROR] {message}", file=sys.stderr)
    return 1


def load_api_key() -> str:
    api_key = os.environ.get("CLPAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("未找到 CLPAI_API_KEY，请通过环境变量提供，不要写入仓库文件")
    return api_key


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def build_daily_prompt(date_text: str) -> str:
    script = repo_root() / "scripts" / "daily-cover-prompt.py"
    proc = subprocess.run(
        [sys.executable, str(script), "--date", date_text],
        cwd=repo_root(),
        check=False,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"daily-cover-prompt.py 执行失败: {proc.stderr.strip()}")
    prompt = proc.stdout.strip()
    if not prompt:
        raise RuntimeError("daily-cover-prompt.py 未输出提示词")
    return prompt


def normalize_base_url(api_url: str) -> str:
    return api_url.rstrip("/")


def build_request(api_url: str, endpoint: str, api_key: str, args: argparse.Namespace, prompt: str) -> urllib.request.Request:
    endpoint_path = endpoint if endpoint.startswith("/") else f"/{endpoint}"
    url = f"{normalize_base_url(api_url)}{endpoint_path}"
    payload = {
        "model": args.model,
        "prompt": prompt,
        "n": 1,
        "size": args.size,
        "response_format": "url",
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    return urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "my-blog-daily-cover/1.0",
        },
        method="POST",
    )


def call_api(request: urllib.request.Request, timeout: int) -> dict[str, Any]:
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read()
            status = getattr(response, "status", None)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"CLPAI API HTTP {exc.code}: {body[:1200]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"CLPAI API 请求失败: {exc}") from exc

    try:
        payload = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"CLPAI API 返回非 JSON 响应，HTTP {status}") from exc

    if status is not None and not 200 <= int(status) < 300:
        raise RuntimeError(f"CLPAI API HTTP {status}: {json.dumps(payload, ensure_ascii=False)[:1200]}")
    if isinstance(payload, dict) and payload.get("error"):
        raise RuntimeError(f"CLPAI API 返回错误: {json.dumps(payload.get('error'), ensure_ascii=False)}")
    return payload


def _walk(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _walk(child)
    elif isinstance(value, list):
        for item in value:
            yield from _walk(item)


def extract_image_payload(resp: dict[str, Any]) -> tuple[str, str]:
    """Return (kind, value), where kind is url or base64."""
    for obj in _walk(resp):
        url = obj.get("url")
        if isinstance(url, str) and url.startswith(("http://", "https://")):
            return ("url", url)

        image_url = obj.get("image_url")
        if isinstance(image_url, dict):
            nested = image_url.get("url")
            if isinstance(nested, str) and nested.startswith(("http://", "https://")):
                return ("url", nested)

        for key in ("b64_json", "base64", "image", "data"):
            value = obj.get(key)
            if not isinstance(value, str) or len(value) < 128:
                continue
            if value.startswith("data:image/"):
                _, _, encoded = value.partition(",")
                return ("base64", encoded)
            if looks_like_base64_image(value):
                return ("base64", value)

    raise RuntimeError("CLPAI 响应中未找到图片 URL 或 base64 图片数据")


def looks_like_base64_image(value: str) -> bool:
    compact = value.strip()
    if len(compact) < 128:
        return False
    sample = compact[:64]
    return all(ch.isalnum() or ch in "+/=_-" for ch in sample)


def decode_base64_image(value: str) -> bytes:
    normalized = value.strip().replace("-", "+").replace("_", "/")
    padding = (-len(normalized)) % 4
    normalized += "=" * padding
    return base64.b64decode(normalized)


def download_image(url: str, timeout: int) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def validate_image_bytes(data: bytes) -> str:
    if data.startswith(PNG_MAGIC):
        return "png"
    if data.startswith(JPEG_MAGIC):
        return "jpg"
    if data.startswith(WEBP_MAGIC) and data[8:12] == b"WEBP":
        return "webp"
    raise RuntimeError("下载结果不是可识别的 PNG/JPEG/WebP 图片")


def save_image(data: bytes, output_path: Path) -> Path:
    image_type = validate_image_bytes(data)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() == ".png" and image_type != "png":
        raise RuntimeError(
            f"上游返回 {image_type.upper()}，目标是 PNG。为避免本地转换生成，已拒绝保存为假 PNG。"
        )
    output_path.write_bytes(data)
    return output_path


def default_output_path(date_text: str) -> Path:
    return repo_root() / "static" / "images" / "daily" / f"{date_text}-daily-news.png"


def redact_response(resp: dict[str, Any]) -> dict[str, Any]:
    redacted = json.loads(json.dumps(resp))
    for obj in _walk(redacted):
        for key in ("b64_json", "base64", "image", "data"):
            value = obj.get(key)
            if isinstance(value, str) and len(value) > 128:
                obj[key] = f"<redacted:{len(value)} chars>"
    return redacted


def main() -> int:
    args = parse_args()
    try:
        api_key = load_api_key()
        prompt = args.prompt if args.prompt is not None else build_daily_prompt(args.date)
        output_path = Path(args.output) if args.output else default_output_path(args.date)

        print(f"[INFO] 模型: {args.model}", file=sys.stderr)
        print(f"[INFO] 输出: {output_path}", file=sys.stderr)
        print("[INFO] 正在调用 CLPAI 生图接口...", file=sys.stderr)

        request = build_request(args.api_url, args.endpoint, api_key, args, prompt)
        response = call_api(request, args.timeout)
        if args.keep_response:
            Path(args.keep_response).write_text(
                json.dumps(redact_response(response), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

        kind, value = extract_image_payload(response)
        image_bytes = download_image(value, args.timeout) if kind == "url" else decode_base64_image(value)
        saved_path = save_image(image_bytes, output_path)

        result = {
            "status": "success",
            "model": args.model,
            "date": args.date,
            "file": str(saved_path),
            "bytes": len(image_bytes),
            "source": "clpai",
        }
        if args.json_result:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(str(saved_path))
        return 0
    except Exception as exc:
        return emit_error(type(exc).__name__, str(exc))


if __name__ == "__main__":
    sys.exit(main())
