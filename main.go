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
		market = "STK" // 기본값 KOSPI
	}

	formData := url.Values{}
	formData.Set("bld", "dbms/MDC/STAT/standard/MDCSTAT02303")
	formData.Set("trdDd", date)
	formData.Set("mktId", market)
	formData.Set("share", "1")
	formData.Set("money", "1")
	formData.Set("csvxls_isNo", "false")

	// 세션 쿠키 먼저 획득
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Jar: jar}

	initReq, _ := http.NewRequest("GET", "https://data.krx.co.kr/contents/MDC/STAT/standard/MDCSTAT02303.cmd", nil)
	initReq.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	client.Do(initReq)

	req, err := http.NewRequest("POST", "https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd", strings.NewReader(formData.Encode()))
	if err != nil {
		http.Error(w, `{"error":"요청 생성 실패"}`, 500)
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Referer", "https://data.krx.co.kr/contents/MDC/STAT/standard/MDCSTAT02303.cmd")
	req.Header.Set("Accept", "application/json, text/javascript, */*; q=0.01")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")

	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, `{"error":"KRX 요청 실패"}`, 500)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	log.Printf("[KRX RAW] %s", string(body[:min(len(body), 500)]))

	var krxResp KRXResponse
	if err := json.Unmarshal(body, &krxResp); err != nil {
		log.Printf("[KRX ERR] %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(500)
		w.Write([]byte(`{"error":"KRX 응답 파싱 실패","raw":"` + strings.ReplaceAll(string(body[:min(len(body), 200)]), `"`, `'`) + `"}`))
		return
	}
	if len(krxResp.Output) == 0 {
		http.Error(w, `{"error":"데이터 없음 (휴장일이거나 날짜 오류)"}`, 404)
		return
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

	result := InstitutionalResp{}
	if len(items) >= 10 {
		result.Top = items[:10]
		result.Bottom = items[len(items)-10:]
	} else {
		result.Top = items
	}

	json.NewEncoder(w).Encode(result)
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

func main() {
	initDB()
	if db != nil {
		defer db.Close()
	}

	http.HandleFunc("/api/health", healthHandler)
	http.HandleFunc("/api/institutional", institutionalHandler)
	http.Handle("/", http.FileServer(http.Dir(".")))

	port := "8080"
	fmt.Printf("서버 시작: http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
