package api

import (
	"github.com/cedbossneo/openmower-gui/docs"
	"github.com/cedbossneo/openmower-gui/pkg/providers"
	"github.com/cedbossneo/openmower-gui/pkg/types"
	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"log"
)

// gin-swagger middleware
// swagger embed files

func NewAPI(dbProvider types.IDBProvider, dockerProvider types.IDockerProvider, rosProvider types.IRosProvider, firmwareProvider *providers.FirmwareProvider, ubloxProvider *providers.UbloxProvider) {
	httpAddr, err := dbProvider.Get("system.api.addr")
	if err != nil {
		log.Fatal(err)
	}

	gin.SetMode(gin.ReleaseMode)
	docs.SwaggerInfo.BasePath = "/api"
	r := gin.Default()
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowWebSockets = true
	r.Use(cors.New(config))
	webDirectory, err := dbProvider.Get("system.api.webDirectory")
	if err != nil {
		log.Fatal(err)
	}
	r.Use(static.Serve("/", static.LocalFile(string(webDirectory), false)))
	apiGroup := r.Group("/api")
	ConfigRoute(apiGroup, dbProvider)
	SettingsRoutes(apiGroup, dbProvider)
	ContainersRoutes(apiGroup, dockerProvider)
	OpenMowerRoutes(apiGroup, rosProvider)
	SetupRoutes(apiGroup, firmwareProvider, ubloxProvider)
	tileServer, err := dbProvider.Get("system.map.enabled")
	if err != nil {
		log.Fatal(err)
	}
	if string(tileServer) == "true" {
		TilesProxy(r, dbProvider)
	}
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))
	r.Run(string(httpAddr))
}
