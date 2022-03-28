NAME=$(git config --get remote.origin.url | sed 's/.*\/\([^.]*\).*/\1/')
TAG=latest
EXPOSE=3000

docker build -f deployments/dockerfile -t ${NAME}:${TAG} .

docker ps -f name=${NAME} -q | xargs --no-run-if-empty docker container stop
docker container ls -a -fname=${NAME} -q | xargs -r docker container rm
docker images --no-trunc --all --quiet --filter='dangling=true' | xargs --no-run-if-empty docker rmi
docker run --network ${DOCKER_NETWORK} --expose ${EXPOSE} -d --name ${NAME} ${NAME}:${TAG}