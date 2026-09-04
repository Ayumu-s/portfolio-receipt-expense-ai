"""Deterministic receipt analysis used by the public portfolio demo."""


MOCK_RESULT = (
    "日付：2026年08月23日\n"
    "お店、会社名：Demo Market\n"
    "勘定科目：食費\n"
    "合計金額：1,280円\n"
    "支払方法：クレジットカード\n"
    "備考：公開用の架空レシートを使ったMock解析"
)


MOCK_RESULTS_BY_FILENAME = {
    "portfolio-demo-grocery.png": (
        "日付：2026年08月23日\n"
        "お店、会社名：Demo Market\n"
        "勘定科目：食費\n"
        "合計金額：1,277円\n"
        "支払方法：現金\n"
        "備考：公開用の架空レシートを使ったMock解析"
    ),
    "portfolio-demo-cafe.png": (
        "日付：2025年05月18日\n"
        "お店、会社名：カフェ ソラノネ\n"
        "勘定科目：会議費\n"
        "合計金額：980円\n"
        "支払方法：現金\n"
        "備考：公開用の架空レシートを使ったMock解析"
    ),
    "portfolio-demo-stationery.png": (
        "日付：2025年05月24日\n"
        "お店、会社名：文具の森\n"
        "勘定科目：消耗品費\n"
        "合計金額：3,795円\n"
        "支払方法：クレジットカード\n"
        "備考：公開用の架空レシートを使ったMock解析"
    ),
    "portfolio-demo-restaurant.png": (
        "日付：2024年05月18日\n"
        "お店、会社名：和ごころ食堂 結\n"
        "勘定科目：会議費\n"
        "合計金額：4,800円\n"
        "支払方法：クレジットカード\n"
        "備考：公開用の架空レシートを使ったMock解析"
    ),
    "portfolio-demo-household.png": (
        "日付：2024年06月15日\n"
        "お店、会社名：毎日くらしの店\n"
        "勘定科目：消耗品費\n"
        "合計金額：2,100円\n"
        "支払方法：現金\n"
        "備考：公開用の架空レシートを使ったMock解析"
    ),
}


async def analyze_receipt(image_bytes: bytes, filename: str = "") -> str:
    """Return fictional structured data without network or AI SDK calls."""
    del image_bytes
    return MOCK_RESULTS_BY_FILENAME.get(filename, MOCK_RESULT)
