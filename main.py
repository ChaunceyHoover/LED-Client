import socketserver

class LEDServer(socketserver.BaseRequestHandler):
    """
    hey hi how ya doin
    """

    def handle(self):
        self.data = self.request.recv(1024).strip()
        print("{} wrote: ".format(self.client_address[0]))
        print(self.data)
        # send back data
        self.request.sendall(self.data.upper())

if __name__ == "__main__":
    HOST, PORT = "localhost", 12345

    with socketserver.TCPServer((HOST, PORT), LEDServer) as server:
        # ACTIVATE THE SERVER
        print('Listening on port {}'.format(PORT))
        server.serve_forever()