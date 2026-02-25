package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var db *sql.DB

func initDB() {
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASS")
	name := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4", user, pass, host, port, name)

	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Printf("DB 연결 실패: %v", err)
		return
	}

	if err = db.Ping(); err != nil {
		log.Printf("DB Ping 실패: %v", err)
		return
	}

	log.Println("DB 연결 성공!")
}

type StockItem struct {
	Code    string  `json:"code"`
	Name    string  `json:"name"`
	NetBuy  float64 `json:"netBuy"`
	NetBuyF string  `json:"netBuyF"`
}

type InstitutionalResp struct {
	Top    []StockItem `json:"top"`
	Bottom []StockItem `json:"bottom"`
}

type KRXItem struct {
	ISU_SRT_CD         string `json:"ISU_SRT_CD"`
	ISU_ABBRV          string `json:"ISU_ABBRV"`
	INST_NETBID_TRDVAL string `json:"INST_NETBID_TRDVAL"`
}

type KRXResponse struct {
	Output []KRXItem `json:"output"`
}

func loadFromDB(date, market string) ([]StockItem, error) {
	rows, err := db.Query(
		"SELECT stock_code, stock_name, net_buy FROM institutional_data WHERE trade_date=? AND market=? ORDER BY net_buy DESC",
		date, market,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []StockItem
	for rows.Next() {
		var code, name string
		var netBuy int64
		if err := rows.Scan(&code, &name, &netBuy); err != nil {
			continue
		}
		v := float64(netBuy)
		items = append(items, StockItem{
			Code:    code,
			Name:    name,
			NetBuy:  v,
			NetBuyF: formatKRW(v),
		})
	}
	return items, nil
}

func saveToDB(date, market string, items []StockItem) {
	// 기존 데이터 삭제 후 재삽입
	db.Exec("DELETE FROM institutional_data WHERE trade_date=? AND market=?", date, market)

	stmt, err := db.Prepare(
		"INSERT INTO institutional_data (trade_date, market, stock_code, stock_name, net_buy) VALUES (?, ?, ?, ?, ?)",
	)
	if err != nil {
		log.Printf("[DB] Prepare 실패: %v", err)
		return
	}
	defer stmt.Close()

	for _, item := range items {
		_, err := stmt.Exec(date, market, item.Code, item.Name, int64(item.NetBuy))
		if err != nil {
			log.Printf("[DB] Insert 실패: %v", err)
		}
	}
	log.Printf("[DB] %s %s 데이터 %d건 저장 완료", date, market, len(items))
}

func setBrowserHeaders(req *http.Request, referer string) {
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Connection", "keep-alive")
	if referer != "" {
		req.Header.Set("Referer", referer)
	}
}

func fetchFromKRX(date, market string) ([]StockItem, error) {
	formData := url.Values{}
	formData.Set("bld", "dbms/MDC/STAT/standard/MDCSTAT02303")
	formData.Set("trdDd", date)
	formData.Set("mktId", market)
	formData.Set("share", "1")
	formData.Set("money", "1")
	formData.Set("csvxls_isNo", "false")

	jar, _ := cookiejar.New(nil)
	client := &http.Client{Jar: jar}

	// Step 1: 메인 페이지 방문
	r1, _ := http.NewRequest("GET", "https://data.krx.co.kr", nil)
	setBrowserHeaders(r1, "")
	client.Do(r1)

	// Step 2: 데이터 페이지 방문 (세션 쿠키 획득)
	r2, _ := http.NewRequest("GET", "https://data.krx.co.kr/contents/MDC/STAT/standard/MDCSTAT02303.cmd", nil)
	setBrowserHeaders(r2, "https://data.krx.co.kr")
	client.Do(r2)

	// Step 3: 실제 데이터 요청
	req, err := http.NewRequest("POST", "https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd", strings.NewReader(formData.Encode()))
	if err != nil {
		return nil, fmt.Errorf("요청 생성 실패: %v", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/javascript, */*; q=0.01")
	req.Header.Set("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
	req.Header.Set("Referer", "https://data.krx.co.kr/contents/MDC/STAT/standard/MDCSTAT02303.cmd")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")
	req.Header.Set("Origin", "https://data.krx.co.kr")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("KRX 요청 실패: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	log.Printf("[KRX RAW] %s", string(body[:min(len(body), 500)]))

	var krxResp KRXResponse
	if err := json.Unmarshal(body, &krxResp); err != nil {
		return nil, fmt.Errorf("KRX 파싱 실패: %v (raw: %s)", err, string(body[:min(len(body), 200)]))
	}
	if len(krxResp.Output) == 0 {
		return nil, fmt.Errorf("데이터 없음 (휴장일이거나 날짜 오류)")
	}

	var items []StockItem
	for _, row := range krxResp.Output {
		val := strings.ReplaceAll(row.INST_NETBID_TRDVAL, ",", "")
		v, _ := strconv.ParseFloat(val, 64)
		items = append(items, StockItem{
			Code:    row.ISU_SRT_CD,
			Name:    row.ISU_ABBRV,
			NetBuy:  v,
			NetBuyF: formatKRW(v),
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].NetBuy > items[j].NetBuy
	})

	return items, nil
}

func institutionalHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	date := r.URL.Query().Get("date")
	market := r.URL.Query().Get("market")
	if date == "" {
		http.Error(w, `{"error":"date 파라미터 필요"}`, 400)
		return
	}
	if market == "" {
		market = "STK"
	}

	// DB에서 먼저 조회
	if db != nil {
		dbItems, err := loadFromDB(date, market)
		if err == nil && len(dbItems) > 0 {
			log.Printf("[CACHE HIT] %s %s - %d건", date, market, len(dbItems))
			result := buildResult(dbItems)
			json.NewEncoder(w).Encode(result)
			return
		}
	}

	// DB에 없으면 KRX에서 가져오기
	items, err := fetchFromKRX(date, market)
	if err != nil {
		if strings.Contains(err.Error(), "데이터 없음") {
			http.Error(w, `{"error":"데이터 없음 (휴장일이거나 날짜 오류)"}`, 404)
		} else {
			http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), 500)
		}
		return
	}

	// DB에 저장
	if db != nil {
		saveToDB(date, market, items)
	}

	result := buildResult(items)
	json.NewEncoder(w).Encode(result)
}

func buildResult(items []StockItem) InstitutionalResp {
	result := InstitutionalResp{}
	if len(items) >= 10 {
		result.Top = items[:10]
		result.Bottom = items[len(items)-10:]
	} else {
		result.Top = items
	}
	return result
}

func formatKRW(v float64) string {
	abs := v
	sign := ""
	if v < 0 {
		abs = -v
		sign = "-"
	}
	if abs >= 1_000_000_000_000 {
		return fmt.Sprintf("%s%.1f조", sign, abs/1_000_000_000_000)
	} else if abs >= 100_000_000 {
		return fmt.Sprintf("%s%.0f억", sign, abs/100_000_000)
	}
	return fmt.Sprintf("%s%.0f만", sign, abs/10_000)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

func aiChatHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"POST만 지원"}`, http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	var req struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request"}`, http.StatusBadRequest)
		return
	}

	// 타입별 프롬프트 조정
	var prompt string
	if req.Type == "business" {
		prompt = fmt.Sprintf("당신은 경험 많은 사업 컨설턴트입니다. 다음 사업 아이디어에 대해 조언해주세요:\n%s", req.Message)
	} else if req.Type == "stock" {
		prompt = fmt.Sprintf("당신은 금융 분석가입니다. 다음 금융/주식 질문에 답변해주세요:\n%s", req.Message)
	} else {
		prompt = req.Message
	}

	response := callOllama(prompt)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"response": response,
	})
}

func callOllama(prompt string) string {
	client := &http.Client{Timeout: 60 * time.Second}

	// NAS IP로 직접 접근
	ollamaURL := "http://124.54.134.127:11434/api/generate"

	reqBody := map[string]interface{}{
		"model":  "gemma3:1b",
		"prompt": prompt,
		"stream": false,
	}

	body, _ := json.Marshal(reqBody)

	resp, err := client.Post(
		ollamaURL,
		"application/json",
		strings.NewReader(string(body)),
	)
	if err != nil {
		log.Printf("[Ollama] 연결 실패: %v (URL: %s)", err, ollamaURL)
		return "AI 모델에 연결할 수 없습니다. Ollama 서버를 확인하세요."
	}
	defer resp.Body.Close()

	var result struct {
		Response string `json:"response"`
	}

	respBody, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(respBody, &result); err != nil {
		log.Printf("[Ollama] 파싱 실패: %v", err)
		return "응답을 파싱할 수 없습니다."
	}

	log.Printf("[Ollama] 성공: %s", ollamaURL)
	return result.Response
}

func main() {
	initDB()
	if db != nil {
		defer db.Close()
	}

	http.HandleFunc("/api/health", healthHandler)
	http.HandleFunc("/api/institutional", institutionalHandler)
	http.HandleFunc("/api/ai-chat", aiChatHandler)
	http.Handle("/", http.FileServer(http.Dir(".")))

	port := "8080"
	fmt.Printf("서버 시작: http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
