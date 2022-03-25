package main

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
)

const PORT = "3000"

func main() {
	mux := InitHttpHandler()

	// start http server
	log.Println("HTTP Server is listening on port " + PORT)

	http.ListenAndServe("localhost:"+PORT, mux)
}

func InitHttpHandler() *http.ServeMux {

	// A http multiplexer for root of handler function
	mux := http.NewServeMux()

	// Server or handler
	fs := http.StripPrefix("/app/", http.FileServer(http.Dir("./web/")))

	// register handlers to multiplexer
	mux.HandleFunc("/", healthCheck)
	mux.Handle("/app/", fs)
	mux.HandleFunc("/download", bulkDownload)

	return mux
}

// Health check handler for root path
func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("[BULK SERVICE] Server is good."))
}

func bulkDownload(w http.ResponseWriter, r *http.Request) {
	// check method
	if r.Method != http.MethodPost {
		err := errors.New("download: method not allowed")
		log.Println(err)
		http.Error(w, err.Error(), http.StatusMethodNotAllowed)
		return
	}

	// check body
	b, err := io.ReadAll(r.Body)
	if err != nil {
		log.Println(err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Json unmarshal
	var urls []string
	err = json.Unmarshal(b, &urls)
	if err != nil {
		log.Println(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
	}

	var limit int = 50
	// Validation, for now, only length of string
	if len(urls) > limit {
		err := errors.New("download: limit exceeded")
		log.Println(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
	}

	// Download
	//

	// Zip

	// response
}

func Download(filepath string, url string) error {
	// Get the data
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Write the body to file
	_, err = io.Copy(out, resp.Body)
	return err
}
