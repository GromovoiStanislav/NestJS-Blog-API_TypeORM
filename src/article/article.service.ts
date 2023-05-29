import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, In } from "typeorm";

import { ArticleEntity } from "src/entities/article.entity";
import { UserEntity } from "src/entities/user.entity";
import { TagEntity } from "src/entities/tag.entity";
import {
  CreateArticleDTO,
  UpdateArticleDTO,
  FindAllQuery,
  FindFeedQuery,
  ArticleResponse
} from "src/models/article.models";

@Injectable()
export class ArticleService {

  constructor(
    @InjectRepository(ArticleEntity) private articleRepo: Repository<ArticleEntity>,
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
    @InjectRepository(TagEntity) private tagRepo: Repository<TagEntity>
  ) {
  }


  private async upsertTags(tagList: string[]): Promise<void> {
    const foundTags = await this.tagRepo.find({
      where: tagList.map(t => ({ tag: t }))
    });
    const newTags = tagList.filter(t => !foundTags.map(t => t.tag).includes(t));
    await Promise.all(
      this.tagRepo.create(newTags.map(t => ({ tag: t }))).map(t => t.save())
    );
  }


  async findAll(
    user: UserEntity,
    query: FindAllQuery
  ): Promise<ArticleResponse[]> {
    let findOptions: any = {
      where: {}
    };
    if (query.author) {
      findOptions.where.author = { username: query.author };
    }
    if (query.favorited) {
      findOptions.where.favoritedBy.username = { username: query.favorited };
    }
    if (query.tag) {
      findOptions.where.tagList = Like(`%${query.tag}%`);
    }
    if (query.offset) {
      findOptions.skip = +query.offset;
    }
    if (query.limit) {
      findOptions.take = +query.limit;
    }
    return (await this.articleRepo.find(findOptions)).map(article =>
      article.toArticle(user)
    );
  }


  async findFeed(
    user: UserEntity,
    query: FindFeedQuery
  ): Promise<ArticleResponse[]> {
    const { followee } = await this.userRepo.findOne({
      where: { id: user.id },
      relations: ["followee"]
    });

    const findOptions: any = {
      where: {
        author: { id: In(followee.map(follow => follow.id)) }
      },
    };
    if (query.offset) {
      findOptions.skip = +query.offset;
    }
    if (query.limit) {
      findOptions.take = +query.limit;
    }

    return (await this.articleRepo.find({
      ...findOptions
    })).map(article =>
      article.toArticle(user)
    );
  }


  async findBySlug(slug: string): Promise<ArticleEntity> {
    return this.articleRepo.findOne({
      where: { slug }
    });
  }


  private ensureOwnership(user: UserEntity, article: ArticleEntity): boolean {
    return article.author.id === user.id;
  }


  async createArticle(
    user: UserEntity,
    data: CreateArticleDTO
  ): Promise<ArticleResponse> {
    const article = this.articleRepo.create(data);
    article.author = user;
    await this.upsertTags(data.tagList);
    const { slug } = await article.save();
    return (await this.articleRepo.findOneBy({ slug })).toArticle(user);
  }


  async updateArticle(
    slug: string,
    user: UserEntity,
    data: UpdateArticleDTO
  ): Promise<ArticleResponse> {
    const article = await this.findBySlug(slug);
    if (!article) {
      throw new NotFoundException();
    }
    if (!this.ensureOwnership(user, article)) {
      throw new ForbiddenException();
    }
    await this.upsertTags(data.tagList);
    //await this.articleRepo.update({ slug }, data);
    Object.assign(article,data)
    await article.save()
    return article.toArticle(user);
  }


  async deleteArticle(
    slug: string,
    user: UserEntity
  ): Promise<ArticleResponse> {
    const article = await this.findBySlug(slug);
    if (!article) {
      throw new NotFoundException();
    }
    if (!this.ensureOwnership(user, article)) {
      throw new ForbiddenException();
    }
    await this.articleRepo.remove(article);
    return article.toArticle(user);
  }


  async favoriteArticle(
    slug: string,
    user: UserEntity
  ): Promise<ArticleResponse> {
    const article = await this.findBySlug(slug);
    if (!article) {
      throw new NotFoundException();
    }
    article.favoritedBy.push(user);
    await article.save();
    return (await this.findBySlug(slug)).toArticle(user);
  }


  async unfavoriteArticle(
    slug: string,
    user: UserEntity
  ): Promise<ArticleResponse> {
    const article = await this.findBySlug(slug);
    if (!article) {
      throw new NotFoundException();
    }
    article.favoritedBy = article.favoritedBy.filter(fav => fav.id !== user.id);
    await article.save();
    return (await this.findBySlug(slug)).toArticle(user);
  }

}
