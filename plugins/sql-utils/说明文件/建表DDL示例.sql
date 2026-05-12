create table movies
(
    id           varchar(64)   not null comment '主键id'
        primary key,
    title        varchar(200)  null comment '名称',
    release_year year          null comment '上映年份',
    director     varchar(64)   null comment '导演',
    duration     decimal(4, 2) null comment '时长（分钟）'
)
    comment '电影基本信息';
