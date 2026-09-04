import asyncio

from services.mock_analysis import analyze_receipt


def test_mock_analysis_returns_fictional_data_without_external_services() -> None:
    result = asyncio.run(analyze_receipt(b"not-an-image"))

    assert "Demo Market" in result
    assert "1,280円" in result
    assert "Mock解析" in result


def test_mock_analysis_returns_sample_specific_data() -> None:
    result = asyncio.run(analyze_receipt(b"not-an-image", "portfolio-demo-cafe.png"))

    assert "カフェ ソラノネ" in result
    assert "980円" in result
    assert "公開用の架空レシートを使ったMock解析" in result
