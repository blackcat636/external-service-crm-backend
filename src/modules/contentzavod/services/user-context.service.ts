import { Injectable, Logger } from '@nestjs/common';
import { MainServerClientService } from '../../../services/main-server-client.service';

@Injectable()
export class UserContextService {
  private readonly logger = new Logger(UserContextService.name);
  private userLoginCache: Map<number, string> = new Map();

  constructor(private readonly mainServerClient: MainServerClientService) {}

  /**
   * Get userLogin from JWT token or cache
   * First tries to decode token to get user ID, then fetches profile if needed
   * @param userId - User ID from JWT token
   * @param email - Email from JWT token (used as fallback if API call fails)
   */
  async getUserLogin(serviceToken: string, userId?: number, email?: string): Promise<string | null> {
    // If userId provided and in cache, return cached value
    if (userId && this.userLoginCache.has(userId)) {
      const cached = this.userLoginCache.get(userId);
      if (cached) {
        this.logger.debug(`Using cached userLogin for user ${userId}: ${cached}`);
        return cached;
      }
    }

    try {
      // Get user profile from main server
      const profileResult = await this.mainServerClient.getUserProfile(serviceToken);

      if (profileResult.status === 200 && profileResult.data) {
        const userData = profileResult.data as any;
        // Try different possible fields for userLogin
        const userLogin =
          userData.userLogin ||
          userData.login ||
          userData.username ||
          userData.email ||
          userData.id?.toString() ||
          null;

        if (userLogin && userData.id) {
          // Cache the userLogin
          this.userLoginCache.set(userData.id, userLogin);
          this.logger.debug(`Cached userLogin for user ${userData.id}: ${userLogin}`);
          return userLogin;
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to get user profile from API: ${error.message}`);
    }

    // Fallback: use email from JWT token if available
    if (email) {
      this.logger.debug(`Using email as userLogin fallback: ${email}`);
      if (userId) {
        this.userLoginCache.set(userId, email);
      }
      return email;
    }

    this.logger.warn(`Unable to determine userLogin for user ${userId}`);
    return null;
  }

  /**
   * Get userLogin from JWT token payload (user ID and email)
   */
  async getUserLoginFromToken(serviceToken: string, userId: number, email?: string): Promise<string | null> {
    return this.getUserLogin(serviceToken, userId, email);
  }

  /**
   * Clear cache for a user
   */
  clearCache(userId: number): void {
    this.userLoginCache.delete(userId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.userLoginCache.clear();
  }
}
