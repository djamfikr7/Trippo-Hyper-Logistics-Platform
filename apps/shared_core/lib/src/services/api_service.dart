import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const String baseUrl = 'http://localhost:8000/api'; // Traefik gateway

  ApiService()
    : _dio = Dio(
        BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ),
      ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (e, handler) {
          if (e.response?.statusCode == 401) {
            // Handle token expiration / refresh logic
          }
          return handler.next(e);
        },
      ),
    );
  }

  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    return await _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) async {
    return await _dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) async {
    return await _dio.put(path, data: data);
  }

  Future<Response> delete(String path) async {
    return await _dio.delete(path);
  }

  Future<void> saveToken(String token) async {
    await _storage.write(key: 'access_token', value: token);
  }

  Future<void> deleteToken() async {
    await _storage.delete(key: 'access_token');
  }
}
