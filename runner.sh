#!/bin/sh

echo "INDICES"
curl -XGET 'localhost:9200/_cat/indices?v'
echo "MAPPINGS"
curl -XGET 'http://localhost:9200/logs/_mapping/log?pretty' 
echo "REMOVE INDICES"
#curl -XDELETE 'http://localhost:9200/logs/' # remove all logs
echo "CREATE INDICE"
curl -XPOST 'localhost:9200/logs?pretty'
echo "CREATE MAPPING"
curl -XPOST 'localhost:9200/logs/_mapping/log?pretty' -d @models/logs.mapping.json
while [ true ]
do
    #curl curl 'http://myapi.miapi.com:8080/foo' -H 'Origin: http://miapi.com:8080' -H 'Accept-Encoding: gzip,deflate,sdch' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8080/' -H 'Connection: keep-alive' --compressed
    curl 'http://myapi.miapi.com:8070/echoed' -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate,sdch' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' --compressed
    curl 'http://myapi.miapi.com:8070/status' -H 'x-forwarded-for: 190.18.149.180' -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate,sdch' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' --compressed; echo 
    curl 'http://myapi.miapi.com:8070/foo' -H 'x-forwarded-for: 190.18.149.180' -H 'Origin: http://miapi.com:8070' -H 'Accept-Encoding: gzip,deflate,sdch' -H 'Accept-Language: en-US,en;q=0.8,es-419;q=0.6,es;q=0.4' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36' -H 'Accept: */*' -H 'Referer: http://miapi.com:8070/' -H 'Connection: keep-alive' --compressed
    sleep 10
done
