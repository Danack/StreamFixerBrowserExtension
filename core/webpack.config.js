var path = require("path")

module.exports = (env) => {

    var isProd = env === "prod";

    return {
        mode: isProd ? "production" : "development",

        // Enable sourcemaps for debugging webpack's output.
        devtool: "source-map",

        resolve: {
            // Add '.ts' and '.tsx' as resolvable extensions.
            extensions: [".ts", ".tsx", ".js", ".jsx"]
        },

        module: {
            rules: [
                {
                    test: /\.ts(x?)$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: "ts-loader"
                        }
                    ]
                },
                // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
                {
                    enforce: "pre",
                    test: /\.js$/,
                    loader: "source-map-loader"
                },
                {
                    test: /\.css$/,
                    use: [
                        'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                // importLoaders: 1,
                                modules: true
                            }
                        }
                    ]
                }
            ]
        },

        output: {
            path: path.resolve(__dirname, './dist/' + (isProd ? "prod/" : "dev/")),

        },
        // When importing a module whose path matches one of the following, just
        // assume a corresponding global variable exists and use that instead.
        // This is important because it allows us to avoid bundling all of our
        // dependencies, which allows browsers to cache those libraries between builds.
        // externals: {
        //     "react": "React",
        //     "react-dom": "ReactDOM"
        // }
    }
};