package main

import (
	"archive/zip"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"io/ioutil"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

const PORT = "3000"
const WORKDIR = "./cache/"

type BulkDownloadInput struct {
	Prefix  string   `json:"prefix"`
	Suffix  string   `json:"suffix"`
	Pattern []string `json:"pattern"`
}

func main() {
	mux := InitHttpHandler()

	// start http server
	log.Println("HTTP Server is listening on port " + PORT)

	http.ListenAndServe(":"+PORT, mux)
}

func InitHttpHandler() *http.ServeMux {

	// A http multiplexer for root of handler function
	mux := http.NewServeMux()

	// Server or handler
	fs := http.FileServer(http.Dir("./web/"))
	// fs := http.StripPrefix("/web/", http.FileServer(http.Dir("./web/")))

	// register handlers to multiplexer
	// mux.HandleFunc("/", healthCheck)
	mux.Handle("/", fs)
	mux.HandleFunc("/request", bulkDownload)

	return mux
}

// Health check handler for root path
func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("[BULK SERVICE] Server is good."))
}

func bulkDownload(w http.ResponseWriter, r *http.Request) {
	// check method
	if r.Method != http.MethodPost {
		err := errors.New("download: method not allowed - " + r.Method)
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
	var input BulkDownloadInput
	err = json.Unmarshal(b, &input)
	if err != nil {
		log.Println(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
	}

	var limit int = 50
	// Validation, for now, only length of string
	if len(input.Pattern) > limit {
		err := errors.New("download: limit exceeded")
		log.Println(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
	}

	// Create work id
	// - work id is only unixtimemilli
	workIdInt := time.Now().UnixMilli()
	workId := strconv.FormatInt(workIdInt, 10)
	if err := os.Mkdir(WORKDIR+workId, os.ModePerm); err != nil {
		log.Println(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
	}

	// Download
	errs := make([]error, 0)
	for _, v := range input.Pattern {
		err := Download(WORKDIR+workId+"/"+v, input.Prefix+v+input.Suffix)
		if err != nil {
			errs = append(errs, err)
		}
	}

	warning := "download: warning: \n"
	if len(errs) > 0 {
		for _, v := range errs {
			warning = warning + v.Error() + "\n"
		}
		log.Println(warning)
	}

	// Zip
	err = Zip(workId)
	if err != nil {
		log.Println(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
	}

	// Response
	fileByte, err := ioutil.ReadFile(WORKDIR + workId + ".zip")
	if err != nil {
		log.Println(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Write(fileByte)

	// Removing Cached files
	os.Remove(WORKDIR + workId + ".zip")
	os.RemoveAll(WORKDIR + workId + "/")

}

func Download(filePath string, url string) error {
	// Get the data
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		err := errors.New(resp.Status)
		return err
	}

	// Detect mime type of file
	buffer := make([]byte, 512)
	resp.Body.Read(buffer)
	if err != nil {
		return err
	}
	contentType := http.DetectContentType(buffer)
	extension, err := mime.ExtensionsByType(contentType)
	if err != nil || len(extension) == 0 {
		return err
	}

	// Create the file
	out, err := os.Create(filePath + extension[0])
	if err != nil {
		return err
	}
	defer out.Close()

	// Since first 512 byte of iostream is already read, it should be writed before copying rest of iostream
	_, err = out.Write(buffer)
	if err != nil {
		return err
	}

	// Write the body to file
	_, err = io.Copy(out, resp.Body)
	return err
}

func GetFileContentType(buffer []byte) (string, error) {
	// content-type by returning "application/octet-stream" if no others seemed to match.
	contentType := http.DetectContentType(buffer)

	return contentType, nil
}

func Zip(workId string) error {
	file, err := os.Create(WORKDIR + workId + ".zip")
	if err != nil {
		return err
	}
	defer file.Close()

	z := zip.NewWriter(file)
	defer z.Close()

	err = filepath.Walk(WORKDIR+workId, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 3. Create a local file header
		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}

		// set compression
		header.Method = zip.Deflate

		// 4. Set relative path of a file as the header name
		header.Name, err = filepath.Rel(filepath.Dir(WORKDIR+workId), path)
		if err != nil {
			return err
		}
		if info.IsDir() {
			header.Name += "/"
		}

		// 5. Create writer for the file header and save content of the file
		headerWriter, err := z.CreateHeader(header)
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()

		_, err = io.Copy(headerWriter, f)
		return err
	})

	return err
}
