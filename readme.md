| Bulk donwloading utility service for HGT

## Motivation
Manual download of IB(Investment Bank) Data was one of main bottleneck point in HGT. In 2020-2021, members of HGT group periodically received IB data in Kakao Talk Chat room. These data were composed by one person, 1)downloading PDF from secured urls(in url parameter, there are some kind of token provided when user login to account), 2)converting it into image file, and 3)upload it to chatroom.  

Needs for automating these process was getting bigger, since work volume of these process is punishing for one person. 1) Downloading PDF could be the first step to automate. Downloading from url is fairly simpler then other two tasks, and client(the one who do these process) specifically pick this task and put it to the top of queue.

By automating this task, the client will easily donwload multiple IB data at once, rather than clicking every download button after opening each urls.

## Design
- Web Service
- Embeded into talent-handong.site with html iframe
- Client does form, validation
- Server does downloading, zipping
- Deploy with Github Action
- Run with Docker


## Folder Structure
Folder Structure follows [Standard Go Project Layout](https://github.com/golang-standards/project-layout). The volume of go code is fairly short so it didn't splited into 'internals' folder. Instead, go code is squashed in **main.go** file.

However, there are some folders which are other than go codes.
- .github
- cache (which is not visible since it is literally 'cache')
- deployments
- web

'.github' hidden folder is configuration for [Github Action](https://github.com/features/actions). This folder is containing a github action script.  

'cache' folder, as mentioned earlier it is not visible, is to cache files. As this project is about downloading certain files from some source, **cache** it somewhere, process it, and send it to user, there should be a cache folder that server will use.  

'deployments' folder is somewhat seems redundant with '.github' folder, but task is separated. In deployment process, both '.github' folder and 'deployments' folder are used, but for tasks related to github(such as github action, pulling repository on server) are configured with '.github' folder and **tasks with docker** are configured from this 'deployments' folder.

'web' folder is for static client website. Htmls, css, js files are sit within it.


## Frontend
Web folder is equivalent of frontend. The frontend is composed of HTML-CSS-JS static file, without using any framework or library. It is consited of only one webpage; Bulk Download File page. 

**The final goal** of frontend is making json data which are similar to follows:
```
{
    "prefix": "https://some-pdf-url.com/somePath?DocumentID=",
    "suffix": "&AccessToken=some-access-token",
    "pattern": [
        "10012031",
        "10012032"
        "10012033",
        "10012034",
        "10012035"
    ]
}
```
What is it? This data representing an enumeration of URLs. When this data is received from backend server. The server can create something like follows by joining prefix + pattern + suffix:
```
[
    "https://some-pdf-url.com/somePath?DocumentID=10012031&AccessToken=some-access-token",
    "https://some-pdf-url.com/somePath?DocumentID=10012032&AccessToken=some-access-token",
    "https://some-pdf-url.com/somePath?DocumentID=10012033&AccessToken=some-access-token",
    "https://some-pdf-url.com/somePath?DocumentID=10012034&AccessToken=some-access-token",
    "https://some-pdf-url.com/somePath?DocumentID=10012035&AccessToken=some-access-token"
]
```
By joining prefix, pattern, suffix, the server can generate urls to call. 

ser can type in url and pattern. To achieve this, the page provides 3 or 4 form fields.
- Url Prefix
- Url Suffix
- Pattern Start
- Pattern End



## Backend Server
The backend server is simple http server application implemented with Go.

Main feature of this application is to server certain endpoint with HTTP service and static file service. Http service has only one feature; get url and pattern from client -> download from that url, 

It is composed of 2 endpoints.
- /: static file server for web folder
- /request: an endpoint for bulk download request 




## Deployments