#!/bin/bash
curl -s "https://script.google.com/macros/s/AKfycbwJZ30G6hSpuGEGJHqC2xVl4zALnNgazfHS0c-bkxUAPo0Y7tyThlFqkBjk-h-Ud-_h4A/exec?action=score_all" > /dev/null
osascript -e 'display notification "EquityIQ scores updated" with title "EquityIQ ✅" sound name "Glass"'
